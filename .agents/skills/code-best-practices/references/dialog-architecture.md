# Dialog Architecture

Use this reference for Angular dialogs/modals in this repository. Dialogs use Angular Material: `MatDialog`, `MatDialogRef`, and `MAT_DIALOG_DATA` from `@angular/material/dialog`, with the `mat-dialog-title`, `mat-dialog-content`, and `mat-dialog-actions` directives. Reusable dialog pieces (`dialog-header`) live in `@birthday/web-shared-ui`.

## Terms

- Prefer the term `dialog` in code and docs.
- Treat `modal` as a user-facing synonym unless existing code uses `modal` in a specific API name.

## Core Pattern

Dialogs follow the repository `State + Controller` architecture.

- Components render UI and call controller methods for user events.
- `State` stores dialog signal data when visibility, payload, progress, or selected dialog content belongs to feature state.
- `Controller` owns commands that open, close, update, or react to dialogs.
- Dialog components should stay focused on rendering dialog content and emitting local user actions.

## State Placement

Place dialog state with the owning feature state.

- For feature-level dialog state, use the feature `data-access` library when that is the public state boundary.
- Put dialog state directly under `src/lib/state` in data-access libraries unless the existing feature already uses a narrower state grouping.
- Use a dedicated `dialogs` folder when there are multiple dialog signals or a dialog-specific controller, for example `src/lib/state/dialogs`.
- Export through local barrels and then through the nearest public barrel; do not skip intermediate `index.ts` files.

Use state for:

- dialog visibility signal data;
- dialog payload/input data;
- selected dialog item or entity id;
- loading/progress values shown inside a dialog;
- resettable transient dialog state.

Do not use state for:

- calling the dialog service to open a dialog;
- route navigation after a dialog action;
- analytics, notifications, API calls, or product trigger flag updates;
- subscriptions that coordinate dialog workflows.

## Controller Responsibilities

Controllers are the dialog workflow boundary.

- Inject the dialog service, feature state, metrics, router, and API services as needed.
- Expose named methods such as `openPreview`, `openPermissions`, `closeLoadingDialog`, or `confirmDelete`.
- Update dialog state before/after opening when the dialog component reads from state.
- Close dialog refs when the workflow completes, fails, or resets.
- Guard nullable state before opening dialogs; prefer early returns over non-null assertions.
- Use `takeUntilDestroyed`, `first`, `takeUntil`, or equivalent lifecycle boundaries for dialog-related subscriptions.

## Opening Patterns

Use the existing pattern that matches the feature:

- Direct open: the controller calls `MatDialog.open(Component, { data })`, keeps the returned `MatDialogRef` when it must close the dialog later, and reacts to `afterClosed()`.
- Token-driven component selection: inject a dialog component token when the feature must choose components without depending on a concrete UI library.

For every new dialog, add all of these in the same change:

- a named `open...Dialog()` method in the owning controller;
- dialog data types in the feature `types` folder (see Structure in `code-best-practices`);
- the dialog component export through the nearest UI barrel so the controller's library can import it.

If the owning state or controller does not exist or cannot be found, do not invent a path. Offer to create the missing state/controller under the appropriate feature `data-access/src/lib/state` boundary, or ask the user to provide the exact path.

## Dialog Components

Dialog components should:

- inject `MatDialogRef` when they need to close themselves;
- read dialog data through `inject(MAT_DIALOG_DATA)`;
- delegate feature workflows to controllers instead of embedding API or navigation logic;
- keep reusable visual pieces in the domain `ui` library or `libs/web/shared/ui` when they are not feature-specific.

Feature-specific dialog components can live with the feature's components. Reusable dialog components belong in the relevant shared or domain UI library.

## Reset And Cleanup

Every dialog state owner needs an explicit cleanup strategy.

- `resetState()` must clear dialog signal data, selected ids, progress/loading values, and stored dialog ref references.
- Controllers must close open dialog refs before clearing state when the dialog would otherwise remain visible.
- Root-provided dialog state must not rely on component destruction for cleanup.
- Route-scoped dialog state is preferred when the dialog must not leak across routes or users.

## Trigger Flags And Metrics

Before adding new dialog trigger logic:

- search for existing dialog trigger flags and services;
- reuse existing flags when they describe the same product moment;
- update trigger flags from controllers, resolvers, or shell code that owns the workflow, not from passive state;
- keep analytics/metrics calls in controllers or services dedicated to side effects.

## Checklist

- Dialog state lives at the feature state boundary.
- Dialog opening/closing is owned by a controller or route/shell setup.
- Dialogs include a controller open method and a UI barrel export.
- Missing dialog state/controller or registration locations are clarified with the user or explicitly created; paths are not guessed.
- State does not call dialog services or perform side effects.
- Dialog refs are closed and cleared on completion/reset.
- Barrels expose new state/controller/component files through the nearest public boundary.
- `MatDialog` and the shared dialog pieces are reused.
