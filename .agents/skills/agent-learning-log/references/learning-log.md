# Learning Log

Use this file as the persistent scratchpad for user corrections and durable preferences in this repository.

Add new entries under the category that best matches their purpose, keeping newest entries first within that category.

## Template

```md
## YYYY-MM-DD - Short title

- Type: rule | error | preference | workflow | decision
- Context:
- Incorrect behavior: (only for Type: error)
- Preferred behavior:
- Generalized rule:
- Trigger cues:
- Status: active
```

## Entries

### Architecture

## 2026-07-30 - Keep route default effects in controllers

- Type: error
- Context: Implementing default child-route navigation in a route shell, such as opening the first child item after a resolver loads the parent entity.
- Incorrect behavior: Putting the redirect/default-navigation `effect` directly in the shell component, exposing a public controller init method like `openFirstItemByDefault()`, or injecting a controller in a shell component only to force service construction.
- Preferred behavior: Keep the shell component passive. Put the default-navigation `effect` inside the relevant route-scoped controller constructor, use private helper methods for the effect body when useful, and rely on natural component/controller usage rather than artificial `inject(...)` calls just for instantiation.
- Generalized rule: For Angular route shell behavior in this repository, place reactive navigation side effects in the route-scoped controller constructor, not in the shell component, not behind public lifecycle-style methods, and not via forced DI side effects.
- Trigger cues: default child route, first child redirect, route shell component, controller effect, constructor effect, inject only to instantiate
- Status: active

### Angular

## 2026-08-30 - Expose state signals with component getters

- Type: rule
- Context: Exposing a signal owned by an injected State to a component template.
- Preferred behavior: Use a protected getter when a component only exposes a signal owned by injected State.
- Generalized rule: Do not create a field and constructor assignment solely to re-expose a State signal; return it through a typed protected getter instead.
- Trigger cues: Angular component, State signal, signal proxy, constructor assignment, protected getter
- Status: active

### UI and Styling

### Testing

### Workflow and Tooling

## 2026-10-30 - Reply in the user's language

- Type: error
- Context: The user wrote in Russian, and the agent wrote its replies, questions, and reports in English.
- Incorrect behavior: Answering, asking clarifying questions, and reporting in English when the user writes in another language.
- Preferred behavior: Write every reply, clarifying question, plan, and report in the language of the user's latest message. Code, identifiers, commit messages, branch names, and GitHub Issues keep their own repository rules (English).
- Generalized rule: Match the conversation language to the user's language; repository artifacts follow their own language rules.
- Trigger cues: user writes in Russian, reply language, report language, clarifying questions, AskUserQuestion, plan, final report
- Status: active

## 2026-09-24 - Ask clarifying questions before acting

- Type: preference
- Context: Implementing a feature from a mockup, where the needed icon was missing from the icon set and the data mapping and paywall behavior were unclear.
- Preferred behavior: When requirements, data mapping, design details, or edge cases are unclear, ask the user before implementing. Ask all the open questions in one batch, with suggested options, instead of guessing or quietly choosing a default.
- Generalized rule: Always ask when a task has open questions or needs clarification; do not fill gaps in requirements with assumptions.
- Trigger cues: unclear requirements, mockup, design, missing icon, ambiguous field, edge case, empty state, paywall, clarification, questions
- Status: promoted (task-execution)

## 2026-09-22 - No parentheses in branch names

- Type: rule
- Context: Naming Git branches for this repository.
- Preferred behavior: Never include parentheses `(` or `)` in a branch name, including when the branch name is derived from a ticket title or issue summary that contains parentheses; strip or rephrase around them instead.
- Generalized rule: Branch names in this repository must not contain the characters `(` or `)`.
- Trigger cues: branch name, create branch, write branch, Git branch, parentheses, ticket title, issue title
- Status: active

## 2026-08-27 - Separate review process from code practices

- Type: error
- Context: Promoting learning-log entries into reusable skills.
- Incorrect behavior: Putting implementation conventions and design decisions into the `code-review` skill.
- Preferred behavior: Keep `code-review` limited to the review workflow. Put reusable implementation conventions in `code-best-practices`, and apply that skill to both code changes and code reviews.
- Generalized rule: Separate how code is reviewed from how code should be written; use a shared code-practices skill for the latter.
- Trigger cues: code review skill, code best practices, learning promotion, review workflow, implementation conventions.
- Status: active

## 2026-08-04 - Run GitHub CLI writes outside the sandbox

- Type: error
- Context: Creating GitHub Issues through the repository `github-tasks` workflow.
- Incorrect behavior: Treating `gh auth status` failure inside the sandbox as an invalid user GitHub token and asking the user to re-authenticate.
- Preferred behavior: When GitHub CLI authentication fails in the sandbox, retry the required GitHub CLI command with `require_escalated` permission before reporting an authentication problem.
- Generalized rule: GitHub CLI writes require an escalated retry after sandbox authentication failures; do not ask the user to re-authenticate until the escalated attempt also fails.
- Trigger cues: GitHub Issue, github-tasks, gh auth, invalid token, sandbox, require_escalated, GitHub CLI write
- Status: active

## 2026-07-31 - Write GitHub tasks in English

- Type: rule
- Context: Creating and editing GitHub Issues through the repository task workflow.
- Preferred behavior: Write every GitHub Issue title and body in English.
- Generalized rule: Agent-managed GitHub tasks use English regardless of the conversation language.
- Trigger cues: GitHub task, GitHub Issue, create issue, edit issue, tech debt, bug
- Status: active

## 2026-07-31 - Propose Git names unless execution is explicit

- Type: error
- Context: A user asked to "write a branch and commit" for a file change.
- Incorrect behavior: Interpreting a request to write branch and commit names as authorization to create a branch or commit.
- Preferred behavior: Provide suggested branch and Conventional Commit names only; run Git creation commands only when the user explicitly asks to create the branch and/or commit.
- Generalized rule: Treat requests to name a branch or commit as advisory, not an instruction to mutate Git state.
- Trigger cues: write branch, write commit, branch name, commit name, create branch, make commit, Git operation
- Status: active

## 2026-07-26 - Use Conventional Commits

- Type: rule
- Context: Suggesting commit messages and branch names for this repository.
- Preferred behavior: Use Conventional Commits style for commit messages, for example `feat: make email login step default`, and align branch prefixes with the same intent, for example `feat/email-login-step-default`.
- Generalized rule: When naming commits or branches in this repository, choose a Conventional Commits type that matches the actual change in product behavior or maintenance scope.
- Trigger cues: commit name, branch name, conventional commits, feat, fix, chore, refactor, docs, commit message
- Status: active

## 2026-05-03 - Util libraries use constants and types naming

- Type: rule
- Context: Organizing Angular/Nx util libraries and their public API folders.
- Preferred behavior: Name constants files with `*.constants.ts` and export them from a `constants` folder; place interfaces and related type declarations under `types`, not `interfaces`.
- Generalized rule: In util libraries, prefer `constants` for constants and `types` for interfaces/type declarations; update barrel exports and relative imports after renaming.
- Trigger cues: util lib, constants, consts, interfaces, types, rename file, barrel exports.
- Status: active

## 2026-04-07 - Use full repo-relative paths in commands

- Type: error
- Context: Running Nx and workspace commands that accept file system paths in this repository.
- Incorrect behavior: I suggested a shortened path like `web/auth/data-access`, which created content in the wrong root-level location instead of under `libs/web/...`.
- Preferred behavior: In this repo, commands should use full paths relative to the workspace root, such as `libs/web/auth/data-access`, rather than shortened paths relative to an implied folder like `libs`.
- Generalized rule: When giving commands for this repository, always provide full workspace-relative paths for directories and files. Do not rely on shortened paths or implied roots. When the command supports previewing changes, verify path placement with `--dry-run`.
- Trigger cues: Nx generators, `--directory`, `--destination`, move library, generate library, workspace paths, repo-relative path.
- Status: active
