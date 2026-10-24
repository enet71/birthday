---
name: github-tasks
description: Create, validate, list, inspect, and close GitHub Issues through the agent for tasks, bugs, tech debt, cleanup work, and deferred follow-ups in this repository. Use when the user asks to create a task, record tech debt, file a bug, list open tasks, show GitHub task details, close or complete a task, or manage repository issues through GitHub.
---

# GitHub Tasks

Use this skill to make GitHub Issues the source of truth for agent-managed repository tasks.

The agent must communicate with the user, validate task data before creating issues, and use GitHub Issues for storage and status. Do not use a local markdown backlog as the primary task database.

## Labels

Every issue created by this skill must include:

- `agent-task`
- one type label: `type:bug`, `type:tech-debt`, `type:task`, or `type:cleanup`

Use additional labels only when they are clear from the request or already established in the repository.

Before relying on manual GitHub issue creation, ensure labels exist:

```powershell
node .agents/skills/github-tasks/scripts/github-tasks.mjs labels --write
```

When the user creates an issue directly in GitHub, tell them to add `agent-task` and exactly one `type:*` label so the agent can list and manage it later.

## Creating Issues

When the user asks to create a task, tech debt item, bug, cleanup, or deferred follow-up:

- Write the issue title and body in English.

1. Classify the issue type.
2. Validate that the issue has enough information.
3. Ask for missing critical details before creating the issue.
4. Create the issue through `scripts/github-tasks.mjs create --write`.
5. Report the created issue number and URL.

Required fields:

- title
- type
- problem or context
- desired outcome or expected behavior

For bugs, also ask for reproduction steps when the request does not already contain them. If reproduction is unknown but the user wants to proceed, explicitly write `Reproduction: unknown`.

For tech debt and cleanup, include why the work is not being done now if that is known.

Keep issue bodies concise and implementation-oriented. Avoid broad brainstorming notes.

## Listing Issues

When the user asks what tasks exist, what is open, or asks to list tech debt/bugs:

- Run `scripts/github-tasks.mjs list`.
- Filter by type when the user asks for a specific category.
- Summarize issue number, title, state, labels, and URL.

## Closing Issues

When the user asks to finish, close, drop, or mark a task done:

1. Identify the issue number. If ambiguous, ask which issue to close.
2. Use close reason `completed` for done work.
3. Use close reason `not planned` for dropped/obsolete work.
4. Run `scripts/github-tasks.mjs close --write`.
5. Report the final issue state.

## Script Usage

The bundled script uses Node built-ins and the GitHub CLI only. It is dry-run by default for write operations.

Create:

```powershell
node .agents/skills/github-tasks/scripts/github-tasks.mjs create --type bug --title "Short title" --body "Markdown body" --write
```

List:

```powershell
node .agents/skills/github-tasks/scripts/github-tasks.mjs list --state open
```

Close:

```powershell
node .agents/skills/github-tasks/scripts/github-tasks.mjs close --issue 123 --reason completed --write
```

Ensure labels:

```powershell
node .agents/skills/github-tasks/scripts/github-tasks.mjs labels --write
```

Set `GH_BIN` to the full GitHub CLI path if `gh` is installed outside PATH.
