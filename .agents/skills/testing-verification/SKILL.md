---
name: testing-verification
description: Verifies that implemented work actually behaves correctly by running the project's existing lint, type-check, test and build commands plus targeted manual checks, then reporting precisely what passed, failed, was skipped or could not run. Use after implementation and before code audit or any commit, or whenever the user asks to test, verify or check that something works.
metadata:
  version: "1.0"
---

# Testing Verification

Prove the change works — or prove exactly how far it was verified. Evidence over optimism: a check that did not run is not a passing check.

## Steps

1. **Read the available scripts first.** Inspect `package.json` (and any test/build config) for the real commands. Never invent a script or assume one exists.
2. **Find existing tests** that cover the changed code, then related suites for the same area, so you can extend existing intent rather than duplicating it.
3. **Run the narrowest relevant checks**, in ascending cost, stopping to fix real failures:
   - Lint — the project's lint command.
   - Type check — the project's type-check command (for example a TypeScript compiler run, since lint is not a type check).
   - Unit tests — tests covering the changed functions or components.
   - Integration tests — tests covering the changed server routes, queries or data access.
   - Production build — when the change could affect bundling, routing, server/client boundaries or PWA assets.
4. **Verify behaviour, not just exit codes.** Exercise the feature the way the acceptance criteria describe, including at least one failure path and one edge case (empty state, invalid input, unauthorized access).
5. **Check the data layer only when it is safe.** Read-only queries against a development or test database are fine. Never point tests at production data, and never run destructive commands — resets, drops, truncations, destructive migrations, deletes — without explicit authorization.
6. **Check UI changes on a real viewport.** Use the smallest screen first (mobile-first), then a desktop size. Confirm layout, keyboard and focus behaviour, labels and error states.
7. **Re-run affected checks after every repair.** Earlier passing results do not cover later edits.
8. **Report honestly**, separating automated from manual checks and naming what you could not run.

## Rules

- Inspect `package.json` scripts before running anything; follow the project's own conventions and package manager.
- Do not install dependencies, testing frameworks or tools to make verification possible. If tooling is missing, report it as unavailable instead.
- Never modify production data, and never run destructive database commands without explicit authorization.
- Never weaken, skip or delete a test, add type/lint suppressions, or swallow errors to make a check pass. Fix the cause.
- Never claim tests passed if they were not executed; "no tests exist" is a result, not a pass.
- Distinguish clearly between automated tests, manual checks and checks that were assumed to work.
- Preserve the real exit status of commands; do not let a pipeline hide a failure.
- Report environment limitations honestly (missing service, no database, unavailable browser, no credentials).
- Do not fix product code beyond the minimum needed to make a legitimate check pass — and if a fix is needed, say so.

## Output

- **Tests executed** — each command exactly as run, and what it targeted.
- **Passed checks** — with the relevant result summary.
- **Failed checks** — the failure message, the root cause if known, and whether it was fixed and re-run.
- **Skipped checks** — which, and why.
- **Unavailable checks** — what could not run because of missing tooling, services or environment.
- **Build and type-check results** — stated explicitly, or explicitly "not run".
- **Manual verification** — behaviours exercised (including edge and failure paths) and viewports used for UI changes.
- **Overall status** — `VERIFIED`, `PARTIALLY VERIFIED`, or `NOT VERIFIED`.
