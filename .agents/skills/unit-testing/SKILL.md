---
name: unit-testing
description: Write, update, and run Vitest unit tests for Angular and NestJS code in this repository. Use when the user asks to add, fix, or run unit tests or specs for components, State, Controllers, services, pipes, guards, resolvers, or NestJS controllers and providers, or to set up Vitest for a project, or when the developer agrees to add tests during `task-execution`; do not use for e2e tests.
---

# Unit Testing

Use this skill together with `code-best-practices` and, for frontend code, `angular-developer`.

Whether to add tests for a feature or bug fix is decided by asking the developer (see `task-execution`).

## Environment

- `apps/web` and Angular libraries: Vitest through the Angular CLI `@angular/build:unit-test` builder (`test` target in `project.json`). The `angular-developer` testing references apply. Specs use Vitest globals (`describe`, `it`, `expect`, `vi`) from `vitest/globals` in `tsconfig.spec.json`.
- Change detection: the app is **zoneless**; `zone.js` is not installed. Do not use `fakeAsync`, `tick`, or `waitForAsync`.
- `apps/api` and Node libraries: Vitest through the `@nx/vitest` plugin, which infers the `test` target from the project's `vitest.config.mts` (`environment: 'node'`, `globals: true`, `passWithNoTests: true`).
- Spec files live next to the tested file as `<name>.spec.ts`.
- The Nx generator default for Angular projects is `unitTestRunner: vitest-angular` (see `nx.json`).

## Running Tests

```powershell
npx nx test <project-name>
npx nx test <project-name> --testNamePattern="<test name>"
npx nx affected -t test
```

Find the project name with `npx nx show projects` or in the project's `project.json`. Add `--skip-nx-cache` when a cached result may hide a change.

**Vitest does not type-check.** A spec with TypeScript errors still passes. After writing or changing specs, run the project's `typecheck` target when it exists (otherwise `tsc -p <projectRoot>/tsconfig.spec.json --noEmit`) and its `lint` target.

In WebStorm, if running a spec fails with `This command is not available when running the Angular CLI outside a workspace`, set Run → Edit Configurations → Edit configuration templates → Vitest → "Vitest package" to `<repo>/node_modules/vitest`.

## Adding Vitest To A Project

New projects created through `nx-generate` get a test target from the generator defaults. For an existing project without one, check `npx nx g @nx/vitest:configuration --help` (Node projects) or the Angular application/library generator options (Angular projects) and mirror the configuration of `apps/api` or `apps/web` respectively. Keep `passWithNoTests: true` so `nx run-many -t test` does not fail on projects without specs.

## What To Test

**Test logic, not the DOM.** Unit tests verify TypeScript behavior: return values, signal values, State changes, emitted outputs, and calls to mocked boundaries. They never assert on rendered markup, text, CSS classes, attributes, or element counts, and they never drive the UI through DOM events. Do not use `fixture.nativeElement`, `fixture.debugElement.query*`, `By.css`, `By.directive`, `querySelector`, `textContent`, `element.click()`, `dispatchEvent`, or snapshot tests.

Prioritize by risk:

1. **Controllers** (Angular) and **NestJS services**: workflow commands, State updates after API/dialog/job results, business rules, branching (confirm vs cancel, success vs error), subscriptions bounded by lifecycle.
2. **State**: `computed`/`linkedSignal` derivations and `resetState()`.
3. **Pure utils, pipes, guards, resolvers, NestJS pipes and guards**: inputs → outputs, including edge cases.
4. **Components and NestJS controllers**: only their own logic. Most components only render State and delegate to a Controller, and most NestJS controllers only delegate to a service; they need no test. Do not write `should create` / `should be defined` tests.

If a component contains logic worth testing, first consider whether it belongs in State, Controller, or a pure function (see `code-best-practices`), and test it there.

Do not test private methods, the framework itself, or implementation details such as the exact number of internal calls when the observable outcome is enough.

## Typing Mocks

Declare mock types explicitly. Type each mocked member as `Mock<Service['method']>`:

```ts
import type { Mock } from 'vitest';

const itemsApi: { getItems: Mock<ItemsApiService['getItems']> } = {
  getItems: vi.fn(),
};
```

- Use a plain `Mock` for generic methods such as a dialog service `openDialog`; `Mock<Service['method']>` cannot represent their type parameters.
- Use the real type for non-method members, for example `jobsResult: Subject<JobDto>`.
- Do not use `Mocked<Pick<Service, ...>>`: it fails on generic methods and `readonly` fields.

## Controller And State Tests

Controllers and States are route-provided (`@Injectable()` without `providedIn`), so provide them explicitly. Provide the real State and mock every service the Controller injects.

```ts
import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ItemListController } from './item-list.controller';
import { ItemListState } from './item-list.state';
// ...domain and service imports omitted

describe('ItemListController', () => {
  let controller: ItemListController;
  let state: ItemListState;
  let dialogClosed: Subject<boolean>;
  const itemsApi: {
    getItems: Mock<ItemsApiService['getItems']>;
    deleteItem: Mock<ItemsApiService['deleteItem']>;
  } = {
    getItems: vi.fn(),
    deleteItem: vi.fn(),
  };
  const dialog: { openDialog: Mock } = { openDialog: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    dialogClosed = new Subject<boolean>();
    dialog.openDialog.mockReturnValue({ closed: dialogClosed });
    itemsApi.getItems.mockReturnValue(of([{ id: '1' } as ItemDto]));

    TestBed.configureTestingModule({
      providers: [
        ItemListState,
        ItemListController,
        { provide: ItemsApiService, useValue: itemsApi },
        { provide: DialogService, useValue: dialog },
        // ...every other injected service as a minimal typed mock
      ],
    });

    controller = TestBed.inject(ItemListController);
    state = TestBed.inject(ItemListState);
  });

  it('stores fetched items in state', () => {
    controller.fetchList().subscribe();

    expect(state.items()).toEqual([{ id: '1' }]);
  });

  it('does not delete when the confirm dialog is rejected', () => {
    controller.deleteItem('1');
    dialogClosed.next(false);

    expect(itemsApi.deleteItem).not.toHaveBeenCalled();
  });
});
```

Rules:

- Specs may `TestBed.inject()` State directly to arrange and assert; `local/no-direct-state-inject` allows `*.spec.ts`.
- Mock only the members the code uses. Cast test data with `as Dto` instead of building full DTOs.
- Drive async flows with `of(...)` for immediate results and `Subject` for events the test triggers (dialog `closed`, WebSocket/job streams). Synchronous RxJS sources complete synchronously, so no timer control is needed.
- For real timers (`debounceTime`, `delay`, `interval`, `setTimeout`), use `vi.useFakeTimers()` with `vi.advanceTimersByTime()` and restore with `vi.useRealTimers()` in `afterEach`.
- Call `vi.clearAllMocks()` in `beforeEach` when mocks are declared at `describe` level.
- Assert the observable outcome: State signal values, and calls to mocked boundaries (API, router, notifications, metrics) with their arguments.

## Component Tests

Test a component through its class instance, not its template. Create it with `TestBed.createComponent` so DI and inputs work, then call its methods and read its members. No rendering assertions, so no `fixture.whenStable()` or `fixture.detectChanges()` is needed unless the logic under test runs in a lifecycle hook.

```ts
import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingComponent } from './rating.component';

describe('RatingComponent', () => {
  let fixture: ComponentFixture<RatingComponent>;
  let component: RatingComponent;
  let emitted: Mock<(rating: number) => void>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RatingComponent);
    component = fixture.componentInstance;
    emitted = vi.fn();
    component['updatedRating'].subscribe(emitted);
  });

  it('selects the clicked star and emits the rating', () => {
    component['setRating'](2);

    expect(component['selectedRating']).toBe(3);
    expect(emitted).toHaveBeenCalledWith(3);
  });

  it('only emits the rating when selection is disabled', () => {
    fixture.componentRef.setInput('selectable', false);

    component['setRating'](4);

    expect(component['selectedRating']).toBe(0);
    expect(emitted).toHaveBeenCalledWith(5);
  });
});
```

Rules:

- Call methods and read members on `fixture.componentInstance`. Reach `protected` members with bracket access (`component['setRating'](2)`), which TypeScript allows; do not make members public for tests.
- Assert outputs by subscribing a `vi.fn()` to the output (`output()` or `EventEmitter`).
- Set signal inputs with `fixture.componentRef.setInput(name, value)`; never assign to `input()` fields. Set every `input.required()` before calling logic that reads it.
- Components that read State through `injectState()` need the State provided; for route-scoped State, add it to `providers`, set its signals, and assert derived component values.
- Mock injected Controllers and services and assert that component methods delegate to them with the right arguments.
- If the template references unknown children, provide stubs through `TestBed.overrideComponent(Host, { remove: { imports: [Child] }, add: { imports: [ChildStub] } })` so creation succeeds; the stub needs the same selector and inputs (`NG0304`).

## NestJS Tests

Build a testing module with `Test.createTestingModule` from `@nestjs/testing`, provide the real unit under test, and mock its dependencies with `useValue`:

```ts
import type { Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ItemsService } from './items.service';
import { ItemsRepository } from './items.repository';

describe('ItemsService', () => {
  let service: ItemsService;
  const repository: { findById: Mock<ItemsRepository['findById']> } = {
    findById: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [ItemsService, { provide: ItemsRepository, useValue: repository }],
    }).compile();

    service = moduleRef.get(ItemsService);
  });

  it('throws NotFoundException when the item does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getItem('1')).rejects.toThrow(NotFoundException);
  });
});
```

- Test services, pipes, and guards for business rules, validation, and error mapping (which HTTP exception is thrown for which condition).
- Do not start an HTTP server in unit tests; request-level behavior belongs to `apps/api-e2e`.

## Checklist

- Is each test named for a behavior (`stores fetched items in state`), not for an implementation detail?
- Does each test follow arrange → act → assert, with one behavior per `it`?
- Are both branches of important conditions covered (confirm/cancel, success/error, empty/non-empty)?
- Do tests assert only on logic (values, signals, outputs, thrown errors, mocked calls) and never on the DOM?
- Do the specs pass `npx nx test <project>`, the project's type check, and `npx nx lint <project>`? Report the results faithfully.
