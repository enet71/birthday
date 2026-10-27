# Angular State Architecture

Use this reference for Angular feature state in this repository. The `State`, `StateController`, `ReadonlyState`, and `injectState()` primitives below live in `libs/web/shared/data-access` and are imported from `@birthday/web-shared-data-access`. Do not reimplement or copy them.

## Library And Route Boundaries

Divide a frontend domain under `libs/web/<domain>/` into `data-access`, `feature-*`, `ui`, `util`, and a `feature-shell` that composes feature route arrays. API contracts used by the domain come from `@birthday/shared-models` (see `code-best-practices` → Platform Layout).

- Put cross-feature domain data and shared route context in `<domain>/data-access/src/lib/state`. Provide that State and Controller in root only when route parameters and shared workflow span child features.
- Put feature workflow state and controllers in `<domain>/feature-*/src/lib/state`. Provide them on the owning feature route or shell so their lifetime follows that route.
- Put state and controllers under a page only when they are private to a nested child route. The parent feature state may be injected for shared context.
- Let the feature shell compose exported feature route arrays. A feature owns the routes, providers, resolvers, dialogs, and state for its screens; nesting in a URL does not change that ownership.
- Export state, controllers, routes, and UI through their local barrel and then the nearest library barrel. Do not skip public boundaries.

Route providers are the lifecycle boundary. Register the state and controller together in the route or shell that owns the flow. Register route-specific resolvers, guards, and `provideEnvironmentInitializer` work at that same boundary.

A `feature-*` library does not always own a route. A capability library (for example a live call with its State, Controller, WebSocket/media handling, dialogs, and closely coupled presentational components) can be embedded by other route-owning features through a shared providers array such as `<CAPABILITY>_PROVIDERS`. Keep a capability's state, controller, and tightly coupled UI together in one feature library rather than splitting them across `data-access` and `ui` to satisfy the "feature owns a route" rule literally: a cohesive capability split by category loses cohesion without reducing coupling. A `feature-*` library consumed by other `feature-*` libraries is acceptable for this pattern, provided the capability library never imports back from any of its consumers. A component that itself depends on two different features does not belong in either feature library; keep it in `ui` as a documented exception and let each consuming feature mount the second feature's piece directly, so the shared capability library never has to depend on its sibling.

A reusable capability embedded as a single component (for example `<app-capability [entityId]>`) owns no routes, dialogs, or route providers. Declare its State and Controller in the root component's `providers` so they are created and destroyed with that component; prefer this over route-level providers whenever the capability's lifetime equals the component's. Expose only the inputs and outputs the embedding context needs. A dialog that hosts the capability belongs to the consuming feature: the consumer owns the dialog component, its dialog signal in its own State, the open command in its own Controller, and the dialog-effect registration on its route. Do not put dialog wiring or consumer-specific chrome (dialog header, close button) inside the capability library.

## State + Controller

Use `State` and `StateController` from `@birthday/web-shared-data-access`.

| Layer       | Responsibility                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component   | Renders state, including signals derived from read resources, and delegates user actions to controllers. It may keep purely local presentation state. |
| State       | Holds feature data, UI state, form models, dialog signal data, and derived signals.                                                                   |
| Controller  | Owns user commands and imperative workflows. It updates State after API, router, dialog, notification, analytics, media, or subscription events.      |
| Route/shell | Owns providers, resolvers, guards, dialog-effect registration, and feature lifecycle.                                                                 |

Components, resolvers, guards, and directives read State through `injectState()` and invoke Controller for meaningful commands. Do not make passive shell components create behavior that belongs to the route-scoped controller.

Child components inside a feature read that feature's State and call its Controller directly. Do not convert them into input/output-only presentational components just because a second consumer with a different State temporarily needs them; ask the developer first, and prefer removing or isolating the extra consumer over changing the component contract.

## Read Boundary

Only a State's paired `*.controller.ts` (or an equivalent wiring class named `*.listeners.ts`, used when an effect-only class writes to State without exposing user-facing commands) may `inject()` a State class directly, because that gives full `WritableSignal` access. Everywhere else, use `injectState<T>(StateClass)` from `@birthday/web-shared-data-access`:

```ts
private readonly state: ReadonlyState<FeatureState> = injectState(FeatureState);
```

`ReadonlyState<T>` narrows every `WritableSignal` field to `Signal`, so `.set()`/`.update()` fail to compile outside the owning controller. This is a compile-time narrowing of the same instance, not a runtime lock — it exists to catch accidental writes from the wrong layer, not to defend against a deliberate bypass.

`ReadonlyState<T>` does not narrow a read resource (`ResourceRef`): outside its paired Controller, code must only read the State's derived signals and never call the resource's `set()` or `reload()`. This is enforced by review, not by types.

When the `local/no-direct-state-inject` ESLint rule is configured, it enforces this: it flags `inject(XxxState)` in any file except `*.controller.ts`, `*.state.ts`, `*.listeners.ts`, and `*.spec.ts`. When a resolver, guard, or component needs to change State, add a narrowly named method to the owning Controller (for example `setFilter`, `markItemDone`) and call that instead of writing to the signal directly. Do not reach for a generic `setXxx` that mirrors a field 1:1 with no validation; prefer a method that represents the whole operation (fetch-and-store, mark-complete) so misuse elsewhere stays harmless by construction.

Two documented exceptions call `inject()` on the State class outside its controller, because the callee needs real write access, not a narrowed view:

- **Signal-driven dialogs:** the dialog effect takes a `WritableSignal` with dialog signal data so it can close the dialog itself. In the route/shell `provideEnvironmentInitializer`, use `inject(XxxState)`, not `injectState()`.
- **Signal Forms bound to State:** `form(state.someField)` needs write access for two-way binding. In the owning component, use `inject(XxxState)`, not `injectState()`.

For both, add `// eslint-disable-next-line local/no-direct-state-inject -- <reason>` directly above the `inject()` call, stating why write access is required. Do not add a blanket file-level exemption for these cases; they are call-site exceptions, not a file category.

## State Rules

- Extend `State` and model durable feature values as `signal`, derived values as `computed`, and writable values that reset from a source as `linkedSignal`.
- Keep signal forms and their model in State when the form belongs to the feature workflow. Components bind fields; controllers validate, submit, and navigate.
- Expose writable signals when coordinated feature code must update them; rely on `injectState()` (see [Read Boundary](#read-boundary)) to keep outside code from writing to them. Reach for a private writable signal plus a public readonly accessor (getter/setter pair) only for a specific field that needs its own invariant enforced on every write, not as the default way to protect a whole State class.
- State may depend on parent or shared State for route context and derive its own feature view model from it.
- Implement `resetState()` for root-provided or otherwise reusable State. Reset transient data, loading flags, dialog data, selections, timers, media resources, and other values that must not leak into a new route or user session.
- Declare server reads in State as `rxResource` (see `code-best-practices` → Server Communication). Otherwise keep State free of imperative API calls, router navigation, dialog service calls, notifications, analytics, and workflow subscriptions. Those belong to Controller or route lifecycle code.
- Do not import page or dialog components into State or Controller. Keep component registration at the route or shell boundary.
- Do not use `effect()` in State to copy one signal into another; prefer `computed`, `linkedSignal`, or an explicit controller command. Reserve State `effect()` for narrow cases such as browser media-device updates, and document why.

## Controller Rules

- Extend `StateController`, inject the State and the services required for the workflow, and expose named user-intent methods such as `sendMessage`, `nextStep`, or `openDetailsDialog`.
- Keep API calls, navigation, dialogs, analytics, media/WebSocket work, and subscriptions in Controller. Update State from their results.
- Write mutation results into the State read resource with `set()`, followed by `reload()` if a load was in flight (based on the State's derived signal) or refresh it with `reload()`, and report load errors from a constructor `effect` on the resource's `error()`. See `code-best-practices` → Server Communication.
- Keep long-lived subscriptions bounded with the controller lifecycle, for example `takeUntilDestroyed(this.destroyRef)`.
- Keep route-default navigation and reactive workflow effects in the relevant route-scoped Controller constructor. The component remains a rendering surface.
- Persist a State signal (to `localStorage`, a cookie, a URL) from a Controller `effect` on that signal, not by writing to storage inside each command after `set()`/`update()`. Commands only change the signal, so every write path is persisted. Declare the effect in the Controller constructor. Restore a browser-only stored value in State as a `linkedSignal` that depends on the app-wide `PlatformService.isRendered()` signal from `@birthday/web-shared-util`: it returns the default before the first client render (and on the server, keeping hydration consistent) and the stored value after it. Guard the saving effect with the same `isRendered()`, so its first run does not overwrite the stored value with the default. Do not restore through `afterNextRender` calls and do not add a local "rendered" flag to a Controller or State.
- Guard missing route or state values before using them. Prefer an early return to a non-null assertion when the value is optional.
- Keep helper implementation private; expose only actions that components, guards, resolvers, or other owning workflows need.

## Dialog And Data Loading

For dialogs, follow [Dialog Architecture](dialog-architecture.md). Signal-driven dialogs use all of these together:

1. dialog signal data in the owning feature State;
2. a named Controller command that updates the signal;
3. the dialog effect registered through `provideEnvironmentInitializer` on the owning route or shell;
4. a dialog component exported through the appropriate UI barrel.

Use a resolver only for data that must be loaded before the route activates; load other server data through a State `rxResource`. Resolvers load data at the route boundary and pass the result to a named Controller method that updates State; a resolver must not write to a State signal directly (see [Read Boundary](#read-boundary)). Guards read the scoped State through `injectState()` or delegate policy checks and any state changes to Controllers where user-flow behavior is involved.

## Review Checklist

- Does state scope match its data lifetime: shared domain, feature route, or nested page?
- Is each side effect owned by Controller or route/shell code rather than State or a passive component?
- Are derived values expressed with `computed` or `linkedSignal` instead of synchronization effects?
- Is a persisted State signal saved from a Controller `effect` rather than written to storage inside the commands that change it?
- Are server reads a State `rxResource` with derived signals, mutations Controller Observable workflows that write into that resource, and is `HttpClient` used only inside an `*ApiService`?
- Are route providers, resolvers, dialog wiring, and cleanup colocated with the feature route that owns the screens?
- Are public exports kept at the nearest library boundary?
- If a `feature-*` library without its own route is consumed by other `feature-*` libraries, does it stay free of imports back from any of its consumers?
- Does every file outside `*.controller.ts`/`*.state.ts`/`*.listeners.ts` read State through `injectState()` rather than `inject()`? Any remaining `inject(XxxState)` outside those files needs a documented exception (dialog wiring, Signal Forms binding) with an `eslint-disable-next-line` reason, or a Controller method to route the write through instead.
