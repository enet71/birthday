---
name: code-review
description: Review code changes for defects, regressions, and missing verification. Use when the user asks for a code review, PR review, or change-set audit; do not use for implementation requests.
---

# Code Review

Use the following steps in order. Keep the review read-only unless the user separately asks for changes.

## 1. Establish Scope

Review the complete current change set before drawing conclusions. Inspect `git status --short`, staged and unstaged diffs, relevant untracked files, and the surrounding code needed to understand changed contracts. A file explicitly linked by the user is an entry point for context, not a limit on review scope, unless the user explicitly says to review only that file.

For a branch or pull request review, establish the intended base and inspect the complete diff against it.

## 2. Load Applicable Guidance

Load the repository skills and architecture guidance that match the changed area before assessing conventions. Apply active entries from the learning log when their trigger cues match the review.

Use `code-best-practices` for implementation conventions. This skill defines the review process, not additional coding-style rules.

## 3. Check Readability and Maintainability

Assess whether a future maintainer can accurately follow the change: names communicate intent, control flow is understandable, responsibilities are appropriately located, and duplication or indirection obscures no domain rule. Report this only when it creates a concrete defect, regression risk, or material maintenance hazard.

## 4. Check Behavior and Code Quality

Trace changed data, state, events, and public contracts through their consumers. Look for incorrect behavior, broken edge cases, security or data-loss risks, invalid assumptions, and regressions across the affected workflow.

## 5. Check Templates and Accessibility

For changed Angular templates, verify bindings, control flow, tracking expressions, event handling, loading or empty states, semantic elements, keyboard access, focus behavior, and accessible names. Check that the template remains consistent with its component API and cannot render invalid, stale, or inaccessible UI.

## 6. Check Styles and Responsive UI

For changed styles or UI markup, inspect the affected component's styles and nearby layout context. Check for layout breakage, overflow, interaction-state regressions, responsive failures, and visual coupling that can affect other consumers. Apply styling conventions from `code-best-practices`; do not report mere preference.

## 7. Check Verification

Determine whether changed risky behavior has proportionate automated coverage or another credible verification path. Identify only meaningful test gaps that could allow a regression in the changed behavior.

## 8. Report Evidence-Backed Findings

Prioritize findings that can cause incorrect behavior, regressions, security or data-loss risks, broken public contracts, accessibility failures, or insufficient coverage for changed risky behavior. Do not report stylistic preferences, hypothetical concerns, or existing unrelated issues as findings.

Each finding must include:

- a severity label: `blocker`, `high`, `medium`, or `low`;
- an exact file and line reference;
- the concrete failure mode and the condition that triggers it;
- a concise remediation direction.

Order findings from highest severity to lowest. Lead the response with findings, then state assumptions or open questions, followed by a brief change summary. When no findings are supported by the evidence, say so clearly and mention only meaningful residual risk or verification gaps.
