---
name: feature-development
description: Implements a requested feature or bug fix end to end using the project's existing architecture and conventions, from requirement clarification and planning through a scoped change and handoff to verification and audit. Use when the user asks to build, add, change, fix or refactor functionality in the codebase, including fixing a bug that requires code changes.
metadata:
  version: "1.0"
---

# Feature Development

The implementation workflow. This skill owns the change itself; verification, review and documentation are separate skills, and committing is never part of implementation.

## Steps

1. **Establish the exact requirement.** Restate what the user asked for in concrete terms: who does what, and what the observable result is. Do not silently widen or reinterpret it.
2. **Load context with `project-context`.** Do not plan against assumptions about the codebase, stack or feature status.
3. **Inspect related code.** Read the files you will change and the closest existing analogue of what you are building. Reuse existing helpers, components, types and patterns.
4. **Map the impact.** List which files, layers and dependencies are affected, and check each relevant implication:
   - Data — schema, queries, migrations, existing records.
   - Server — routes, handlers, actions, validation, authorization.
   - UI — components, states, layout, empty and error states.
   - Security — who may read or write this, what input is trusted.
   - Configuration — new dependencies or environment variables (avoid unless necessary).
5. **Write a short plan.** The ordered steps, the files involved and anything deliberately out of scope. Surface any part that needs a product decision or contradicts an accepted decision.
6. **Define acceptance criteria.** Concrete, checkable statements of what "working" means — the exact behaviours `testing-verification` will exercise.
7. **Ask when blocked.** If an essential requirement is genuinely ambiguous, or the change requires a new dependency, schema change or architectural shift that was not requested, ask before building. Do not implement an assumption as if it were confirmed.
8. **Implement only what was requested.** Smallest coherent change. Match the project's naming, file layout, formatting and lint conventions. No unrelated refactors, renames, drive-by fixes or speculative abstractions.
9. **Keep secrets and data safe.** Never read, print or commit `.env` files or credentials. Never run destructive commands or touch production data.
10. **Self-review the diff.** Confirm it contains only intended changes, no debug leftovers, and no accidental configuration or dependency edits.
11. **Hand off.** Invoke `testing-verification` for the changed behaviour, then `code-audit` before calling the work complete.

## Rules

- Do not implement assumptions as confirmed requirements.
- Do not duplicate existing functionality; extend what exists or resolve the duplicate deliberately.
- Do not introduce dependencies, services or patterns without an explicit request and a recorded decision.
- Do not silently change existing product behaviour — call out any user-visible change.
- Do not commit, stage or push.
- Respect and preserve existing user modifications, even in files you touch.
- Do not claim completion before verification and review have run.

## Output

- **Summary** — what was implemented and why, in a few sentences.
- **Changed files** — paths with a one-line purpose each.
- **Acceptance criteria** — the list, and which parts are met.
- **Verification status** — what was checked and by which skill.
- **Remaining work** — open questions, follow-ups, known gaps, and whether documentation and commit are still pending.
