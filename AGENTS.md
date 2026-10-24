<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## General Repository Rules

- This file is the repository-wide agent contract. It applies to the primary agent, built-in subagents, and every custom agent launched from this repository. Do not replace or bypass it with agent-specific instructions; task-specific instructions may only add constraints or narrow the scope.
- `AGENTS.md` is the canonical source of repository rules. Native configuration files for other agents must load this file rather than copy its contents. The canonical repository skills live in `.agents/skills`.
- After cloning or changing the repository skills, run `npm run agents:link` before using Claude Code. It creates a local link to the canonical skills without copying them. Codex reads `.agents/skills` directly.
- Repository subagents are kept manually in sync between Claude Code (`.claude/agents/<name>.md`) and Codex (`.codex/agents/<name>.toml` plus an `[agents.<name>]` entry with the same `description` in `.codex/config.toml`). When adding, changing, or removing a subagent, update both copies in the same change so their instructions stay equivalent. Exception: `ci-monitor-subagent` is Codex-only because the Nx Claude plugin provides it for Claude Code.
- Before starting each task, read `.agents/skills/agent-learning-log/references/learning-log.md` and apply any active learning entries that match the task.
- Before implementing or reviewing application code, use the `code-best-practices` skill and then every more-specific applicable skill.

## Workspace

- `apps/web`: Angular application (SSR, `@angular/build`).
- `apps/api`: NestJS application. In development, `apps/web/proxy.conf.json` proxies `/api` to it.
- `apps/web-e2e`, `apps/api-e2e`: e2e projects.
- `libs/shared/*` (`platform:shared`): framework-free TypeScript used by both apps. `libs/shared/models` (`@birthday/shared-models`) holds DTOs, request and response interfaces.
- `libs/web/*` (`platform:web`): Angular-only libraries.
  - `libs/web/layout/{shell,ui,data-access,util}` (`@birthday/web-layout-*`): the app shell. The app configures it through `APP_LAYOUT_CONFIG`.
  - `libs/web/shared/{ui,util,data-access}` (`@birthday/web-shared-*`): shared dialog pieces, directives, helpers, `PlatformService`, `NotificationsService` (`MatSnackBar`), `ApiService`, `State`, `StateController`, and `injectState`.
  - `libs/web/styles` and `libs/web/assets`: global styles, the Material theme, and fonts, wired into `apps/web`.
- UI components come from Angular Material (`@angular/material`, M3 theme in `libs/web/styles/theme.scss`, icons via `mat-icon` with Material Symbols). Reuse it before writing a new base component.
- Libraries migrated from lemmi-frontend use `migratedLibOverrides` from the root `eslint.config.mjs` (relaxed a11y template rules). Do not add it to new libraries.
- `libs/api/*` (`platform:api`): NestJS/Node-only libraries.
- Every project has one `platform:*` tag; `@nx/enforce-module-boundaries` forbids `web` ↔ `api` imports and any framework imports in `shared`. See `code-best-practices` → Platform Layout.

## Available Skills

Local repository skills live under `.agents/skills`. Each skill must contain a `SKILL.md` file and should be used when its trigger conditions match the user's request.

- All agents must use every applicable repository skill for the current task, including its required references. Do not load unrelated skills merely because they are available: skills are task-scoped instructions, not a prompt to consume wholesale.
- Before creating a nested agent, give it a bounded task and state that this repository contract, the applicable skills, and the learning log remain mandatory. Do not configure a child to override inherited MCP servers, skill configuration, sandbox policy, or model settings unless its task has a concrete need.

- `agent-learning-log`: Persist user corrections, preferences, and process lessons in a reusable learning log, then apply them in later work. Use when the user asks to remember something, save a mistake, add a learning, record a preference, note that a previous approach was wrong, or asks to review and apply past learnings before continuing.
- `angular-developer`: Generates Angular code and provides architectural guidance. Trigger when creating projects, components, or services, or for best practices on reactivity (`signals`, `linkedSignal`, `resource`), forms, dependency injection, routing, SSR, accessibility, animations, styling, testing, or CLI tooling.
- `code-best-practices`: Apply repository code conventions when implementing or reviewing application code. Use alongside the relevant framework and architecture skills; do not use for non-code tasks.
- `code-review`: Review code changes for defects, regressions, and missing verification. Use when the user asks for a code review, PR review, or change-set audit; do not use for implementation requests.
- `task-execution`: Clarify, plan (splitting large tasks into subtasks), implement, run the `code-reviewer` agent, verify, report, hand over for developer review, and write tests with the `unit-test-writer` agent after acceptance. Use whenever the user asks to add or change functionality or to fix a bug; it always asks the developer about open questions and about adding unit tests.
- `unit-testing`: Write, update, and run Vitest unit tests for Angular and NestJS code. Use when the user asks to add, fix, or run unit tests or specs, or agrees to tests during `task-execution`; do not use for e2e tests.
- `github-tasks`: Create, validate, list, inspect, and close GitHub Issues through the agent for tasks, bugs, tech debt, cleanup work, and deferred follow-ups in this repository.
- `link-workspace-packages`: Link workspace packages in monorepos (`npm`, `yarn`, `pnpm`, `bun`). Use when new packages need wiring, when a sibling package import should become a real dependency, or when workspace package resolution fails with errors like `TS2307`, `cannot find module`, or `cannot resolve`.
- `monitor-ci`: Monitor Nx Cloud CI pipelines and handle self-healing fixes. Use when the user asks to monitor CI, watch a branch pipeline, track CI status, or investigate self-healing CI fixes.
- `nx-generate`: Generate code using Nx generators. Invoke immediately for scaffolding, setup, project structure, creating apps or libs, or other generator-driven changes.
- `nx-import`: Import, merge, or combine repositories into an Nx workspace using `nx import`. Use when bringing an existing repository or project into this monorepo while preserving structure or history.
- `nx-plugins`: Find and add Nx plugins. Use when the user wants to discover available plugins, install a new plugin, or add framework and tooling support to the workspace.
- `nx-run-tasks`: Run tasks in an Nx workspace. Use when the user wants to execute build, test, lint, serve, e2e, or any other configured target.
- `nx-workspace`: Explore and understand the Nx workspace. Use when answering questions about projects, targets, dependencies, task availability, or when debugging Nx task configuration and failures.
