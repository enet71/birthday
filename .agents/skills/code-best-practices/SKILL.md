---
name: code-best-practices
description: Apply repository code conventions when implementing or reviewing application code. Use alongside the relevant framework and architecture skills; do not use for non-code tasks.
---

# Code Best Practices

Use these conventions for implementation and code review. Load the more specific Angular and Nx skills when their scope applies.

## General Design Principles

Apply these principles in proportion to the change. Repository architecture and explicit user requirements take precedence.

- **SOLID:** keep each unit focused on one reason to change; extend behavior through stable abstractions when real variation exists; preserve substitutability; keep interfaces narrow; depend on the abstraction that the consumer needs rather than a concrete implementation.
- **GRASP:** assign behavior to the information expert, use controllers as the boundary for application workflows, and prefer high cohesion with low coupling. Introduce indirection only when it reduces a concrete dependency.
- **KISS:** choose the smallest clear design that meets the current requirement. Prefer straightforward control flow and local patterns over cleverness.
- **DRY:** remove meaningful duplication of domain rules, workflows, and invariants. Do not extract coincidental similarity into a shared abstraction.
- **YAGNI:** do not add extension points, configuration, APIs, abstractions, or defensive behavior for hypothetical future needs.
- **Separation of concerns:** keep presentation, state, domain workflows, persistence/API access, and route lifecycle concerns at their established boundaries.
- **Composition over inheritance:** compose small focused services, functions, and components by default; use inheritance only for a genuine shared contract or behavior.
- **Least surprise:** match established repository naming, structure, APIs, and control flow so code behaves as a maintainer expects.
- **Fail fast at boundaries:** validate external, route, and nullable inputs where they enter a workflow; return safely or report a clear error before invalid state propagates.
- **Rule of three:** wait for a third meaningful use before extracting a reusable abstraction, unless an existing repository pattern or public contract already requires one.

## Code Style

- Add comments only to genuinely non-obvious, complex, or tricky code. Do not comment code that is clear from its names and structure.
- Use RxJS `Observable`s for asynchronous application code (HTTP, data services, State/Controller workflows, resolvers). Do not convert Observables to Promises with `firstValueFrom`, `lastValueFrom`, or `toPromise`, and do not wrap them in `async/await`. Return the Observable from controller methods, handle errors with `catchError`, update state in `tap`, and subscribe at the boundary that starts the workflow (with `takeUntilDestroyed` when the subscriber can be destroyed first). Resolvers and guards return the Observable directly.
- Use Promises only where a framework API requires one (for example the Signal Forms `submit()` action): keep the `async` wrapper there thin and subscribe to the Observable inside it rather than awaiting a converted Observable. For genuinely Promise-based APIs, prefer `async/await` over `.then()` chains.

## Server Communication

Server work has one approach per layer: Observables at the transport, signals toward the UI. Do not mix approaches inside a layer.

| Layer                                       | Approach                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Domain `*ApiService` extending `ApiService` | The only place that uses `HttpClient`. Every method returns an RxJS `Observable`.                              |
| State                                       | Declares server reads as `rxResource` and derives signals from them. No imperative API calls or subscriptions. |
| Controller                                  | Owns mutations as Observable workflows and writes their results into the State resource.                       |
| Component, template                         | Reads State signals only. Never injects `HttpClient` or an `*ApiService` and never subscribes to server calls. |

- **Reads:** declare an `rxResource` in the owning State. Take `params` from State signals (including the ones that pick the data source, such as sign-in) and call the domain data service (`*ApiService`, or a service that delegates to it) in `stream`. Expose derived signals such as the data with an empty fallback and `isLoading` for components; the `ResourceRef` stays public only so the paired Controller can write to it. Data that must be loaded before a route activates stays a resolver calling a Controller method (see [State Architecture](references/state-architecture.md)).
- **Refresh and retry:** a root-provided read loads once per params value. When the screen must refresh on entry (which also retries a failed load), the screen's Controller calls a named `reload` command from its constructor; `reload()` is a no-op while the first load is in flight.
- **Load errors:** the Controller reports them from a constructor `effect` on the resource's `error()`; State never calls notifications.
- **Mutations (POST/PUT/PATCH/DELETE):** a Controller method calls the data service and subscribes, following the Observable rules in Code Style. Write the result with the resource's `set()`, or refresh with `reload()`. Base `set()` on the State's derived signal rather than `resource.value()`, because `value()` throws while the resource is in an error state. `set()` also aborts an in-flight load, so when a mutation finishes while the resource is loading, call `reload()` after `set()`. Never perform a mutation through a resource: resources abort in-flight loads when their params change or their owner is destroyed.
- Do not use `httpResource`, `resource` with `fetch`, or `HttpClient` outside an `*ApiService`. They bypass the transport layer and add a second way to talk to the server.

## Platform Layout

The workspace splits libraries by the platform they run on. Every project has exactly one `platform:*` tag, and `@nx/enforce-module-boundaries` in the root `eslint.config.mjs` enforces the dependency direction.

| Folder          | Tag               | Contains                                                                                                                   | May depend on                     |
| --------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `libs/shared/*` | `platform:shared` | Framework-free TypeScript only: models, enums, constants, pure utils. No `@angular/*`, `@nestjs/*`, Node, or browser APIs. | `platform:shared`                 |
| `libs/web/*`    | `platform:web`    | Angular code: State, Controllers, features, UI, web data-access.                                                           | `platform:web`, `platform:shared` |
| `libs/api/*`    | `platform:api`    | NestJS/Node code: modules, controllers, services, repositories.                                                            | `platform:api`, `platform:shared` |

- `apps/web` is `platform:web`; `apps/api` is `platform:api`.
- Generate `libs/shared/*` with `@nx/js:library`, `libs/web/*` with `@nx/angular:library`, and `libs/api/*` with `@nx/nest:library` or `@nx/js:library`. Always pass `--tags=platform:<platform>,type:<type>`.
- Do not put Angular or NestJS code under `libs/shared`. When code is needed on both sides, extract only its framework-free part into `libs/shared/*` and keep the framework wrappers in `libs/web` and `libs/api`.
- Do not create a shared library in advance; create it when the first shared consumer appears.

## Structure

- DTOs, request and response interfaces, and other API contracts between `apps/web` and `apps/api` live in `libs/shared/models` (`@birthday/shared-models`), grouped by domain: `src/lib/<domain>/<name>.dto.ts`, `<name>.request.ts`, `<name>.response.ts`, each exported through `src/lib/<domain>/index.ts` and the library barrel. Both apps import them from there; never duplicate a contract on either side.
- Keep frontend-only domain types (view models, UI state shapes) in the corresponding `libs/web/<domain>/data-access` library, and backend-only types (entities, persistence models) in the corresponding `libs/api/<domain>` library. Keep private UI-only types colocated.
- Place a type by its consumers. A frontend type used by a single feature belongs in `<feature>/src/lib/types/<feature>.interfaces.ts`, exported through `types/index.ts` and the library barrel (for example dialog data such as `<Feature>DialogData`). Move a feature type to the domain `data-access` only when a second feature starts using it. Do not declare types in State, Controller, or component files.
- Keep cross-feature domain state and controllers in the domain `data-access/src/lib/state`. Keep feature-specific state and controllers in the owning `feature-*/src/lib/state`; use page-local state only for a nested route's private lifecycle. Export through the nearest public barrel rather than skipping intermediate `index.ts` files.
- When adding a new top-level folder under a library's `src/lib` (for example `constants`, `types`, `enums`), give it an `index.ts` and export it from `src/lib/index.ts` in alphabetical order, even if it is only used inside the library for now. Check this in code review too.
- Co-locate desktop and mobile component variants with their shared base or directive in one component folder.

## Angular

- Prefer Signal Forms for new forms when the existing APIs support them.
- Prefer `host` metadata to `@HostBinding` and `@HostListener`.
- Initialize signals that depend on injected services in the constructor. Keep imperative initialization side effects in constructors rather than introducing unused `void` fields.
- Avoid controller methods that only forward a single analytics event. Put the event at the owner of the workflow.
- Keep templates focused on rendering and simple bindings. When conditions, derived display values, or event expressions become complex, move them into clearly named component methods, `computed` signals, or view-model state when that makes the code easier to read; retain simple local template control flow when extraction would add indirection.

## Feature State

For Angular feature state, read [State Architecture](references/state-architecture.md) and follow its `State + Controller` pattern before implementing or reviewing changes.

## Dialogs

For Angular dialog or modal work, read [Dialog Architecture](references/dialog-architecture.md) before implementing or reviewing changes. It defines state placement, controller ownership, signal-driven dialog wiring, component boundaries, and cleanup.

## UI and Verification

- Use Angular Material (`@angular/material`) components before writing a new base component; icons use `mat-icon` with Material Symbols names. Customize Material components with their `mat.*-overrides` mixins or system tokens, not by targeting internal `.mat-mdc-*` classes.
- In SCSS, use `rem` for dimensional values and the Material system CSS variables from the theme in `libs/web/styles/theme.scss` (for example `var(--mat-sys-on-surface)`, `var(--mat-sys-primary)`) for colors; do not add hardcoded color values. Do not override a Material component host's display or layout to solve parent layout; use a wrapper. Do not introduce SCSS variables for values used once in a component; write the value inline.
- A loader must cover only the area that is loading. When a loader (for example `mat-progress-spinner`) overlays its area with `position: absolute; inset: 0`, give its wrapper `position: relative`. Otherwise, inside a dialog it covers the header and close button, and the dialog looks frozen and cannot be closed.
- Prefer clear ordinary control flow over duplicate guards or defensive branches that avoid only negligible work.
- Ask the developer whether to add unit tests for each feature or bug fix, as defined in `task-execution`; do not decide to skip or add them on your own.
- When tests are wanted, follow the `unit-testing` skill.
