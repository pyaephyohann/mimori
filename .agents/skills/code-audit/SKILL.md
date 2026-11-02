---
name: code-audit
description: Independently reviews an implementation diff for bugs, regressions, security and authorization gaps, validation and error handling, performance, database correctness, responsive UI and accessibility, then reports severity-ranked findings without editing code. Use when a feature or fix has been implemented, when the user asks for a code audit, security review or review of a diff, or when a change has significant security, authorization, database or architectural impact.
metadata:
  version: "1.0"
---

# Code Audit

A review pass, not a repair pass. Read the code as a skeptical reviewer looking for reasons this change should not ship.

## Scope

- Start from the **actual diff** (`git diff`, `git diff --staged`, or the files named in the request) plus the code around it.
- Audit the implementation itself, not the author's summary of it. If a claim in the description is not backed by the diff, that is a finding.
- Read enough surrounding code to judge correctness: callers, types, schema, and the requirements the change implements.

## Review dimensions

**Correctness**

- Logic errors, off-by-one mistakes, wrong conditionals, inverted checks.
- Null/undefined and empty-collection handling; async ordering; race conditions.
- Regressions in existing behaviour; broken callers of changed functions.
- Type-level problems masked by `any`, casts or non-null assertions.
- Edge cases: empty state, first use, very large input, duplicate submission, repeated action, concurrent updates.

**Security and authorization**

- Is every read and write authorized server-side, by the current user rather than client-supplied identifiers?
- Is client input validated and constrained on the server? Any injection risk in queries?
- Secrets or tokens in code, logs, errors or responses?
- Does any error message leak internal detail or personal data?

**Error handling and validation**

- Are failures handled deliberately, or swallowed silently?
- Are user-visible error states present and meaningful?
- Can a failed operation leave data inconsistent?

**Performance**

- Unnecessary re-renders, redundant queries, N+1 access, unbounded result sets, missing pagination or limits.
- Work that belongs on the server running in the browser, or a request waterfall that could be one round trip.
- Anything that would degrade the installable/app-like experience or add avoidable weight.

**Data**

- Query correctness, filters, ordering and joins.
- Relationship and constraint assumptions; index coverage for new query patterns.
- Destructive or irreversible operations, and whether they are guarded.

**UI, responsiveness and accessibility**

- Mobile-first: does it hold up on a small touch screen and adapt to desktop?
- Semantic elements, labels, focus order, keyboard access, contrast, touch target size.
- Loading, empty and error states; layout shift.

**Requirements fit**

- Does it do what was actually requested — no more, no less?
- Is anything missing from the plan or acceptance criteria?

## Rules

- Do not modify code, configuration or tests during an audit. Report only.
- Prioritize findings by severity; do not bury serious problems among nitpicks.
- Give evidence: file, location, and the relevant snippet or reasoning.
- Do not report speculative issues as confirmed vulnerabilities. Say when a finding is suspected and needs confirmation.
- Do not approve an implementation with unresolved `CRITICAL` issues.
- If a dimension could not be reviewed (missing context, unreadable diff), say so instead of implying it passed.

## Severity levels

| Level | Meaning |
| ----- | ------- |
| `CRITICAL` | Data loss, security exposure, broken core flow, or guaranteed runtime failure. Blocks acceptance. |
| `HIGH` | Serious defect or security weakness likely to affect users. Blocks acceptance unless explicitly accepted by the user. |
| `MEDIUM` | Real problem with a workaround, or a meaningful quality/performance gap. |
| `LOW` | Minor defect, inconsistency or maintainability concern. |
| `INFORMATIONAL` | Observation, question or suggestion; no action required. |

## Output

- **Overall result** — `PASS`, `PASS WITH FINDINGS`, or `BLOCKED`.
- **Findings** — one entry each: severity, file and location, what is wrong, potential impact, recommended fix.
- **Reviewed** — what was actually examined.
- **Not reviewed** — dimensions skipped and why.
- **Required before acceptance** — the must-fix list, or "none".
