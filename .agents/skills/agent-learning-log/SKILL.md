---
name: agent-learning-log
description: Persist user corrections, preferences, and process lessons in a reusable learning log, then apply them in later work. Use when the user says to remember something, save a mistake, add a learning, record a preference, note that a previous approach was wrong, or asks to review and apply past learnings before continuing.
---

# Agent Learning Log

Use this skill to turn user feedback into persistent, reusable operating rules for this repository.

## Core Workflow

Read `references/learning-log.md` when the user asks to record or apply learnings, or when the current task is likely related to previous corrections stored there.

When the user gives corrective feedback or asks to add a learning, first inspect the available repository skills and their descriptions. If an existing skill covers the rule, add the instruction to that skill instead of `references/learning-log.md`. Add a learning-log entry only when no existing skill is an appropriate home.

Keep each entry practical:

- assign one entry type
- describe the concrete situation
- describe the incorrect behavior only for `error` entries
- describe the preferred behavior
- extract a short generalized rule
- add trigger cues so similar tasks are easier to catch later

Do not write vague diary notes. Write operating rules that another agent instance can execute.

Add new entries under the category that best matches their purpose, keeping newest entries first within that category. Use practical category names such as Architecture, Angular, Unit Tests, E2E Tests, UI and Styling, Workflow and Tooling, or add a new category when none fits.

## Entry Rules

Use this structure for every new entry:

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

Use entry types this way:

- `rule`: a standing repository convention or architectural pattern to apply in future work.
- `error`: a mistake or failed approach to avoid repeating. Only this type should include `Incorrect behavior`.
- `preference`: a user preference about style, process, or verification.
- `workflow`: a repeatable task sequence or operational procedure.
- `decision`: a project-specific choice that should be preserved as context.

Prefer short, specific sentences. If the user feedback is ambiguous, ask one clarifying question before recording the rule.

Do not overgeneralize from a one-off stylistic preference unless the user clearly wants it to become a standing rule.

## Applying Learnings

Before substantial work, and especially before starting a task that may overlap with prior corrections, scan `references/learning-log.md` for relevant trigger cues and active rules.

Apply only the entries that clearly match the current task. If multiple rules conflict, prefer the most recent explicit user instruction.

If a stored rule changes the implementation approach in a meaningful way, mention that briefly in a commentary update so the user can correct it early.

## Weekly Promotion

When the user asks to convert accumulated learnings into a dedicated skill, read `references/weekly-promotion.md`.

Promote only repeated or stable patterns. Leave one-off project incidents in the log instead of turning them into permanent skill instructions.
