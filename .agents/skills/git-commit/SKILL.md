---
name: git-commit
description: Creates one safe, well-scoped Git commit after work is complete and verified, by inspecting status and diffs, staging only relevant files, writing a Conventional Commit message and reporting the hash. Use only when the user has explicitly asked to commit; never push, amend or rewrite history without separate authorization.
metadata:
  version: "1.0"
---

# Git Commit

Turn finished, verified work into a single clean commit. This skill commits; it does not push. Treat every Git operation as consequential: inspect before acting.

## Preconditions

- The user has **explicitly authorized a commit**. A feature request, a passing test run or "looks good" is not authorization to commit.
- The work is complete and has been verified (see `testing-verification`).

If either precondition fails, do not commit. Report what would be committed and ask.

## Steps

1. **Inspect the branch and status.** Run `git status`. Note the current branch.
2. **Classify every entry** as modified, deleted, renamed or untracked.
3. **Review the full diff.** Run `git diff` for unstaged and `git diff --staged` for staged changes. Read them; do not skim filenames only.
4. **Identify unrelated changes.** Anything you did not create for this task — other agents, the user's own edits, stray files — is unrelated.
5. **Stop on surprises.** If the working tree contains unexpected changes, unpushed history you were not told about, or files that look like secrets, stop and report before staging anything.
6. **Confirm verification.** Re-run or confirm the checks relevant to the changed code. If a required check fails, do not commit the feature — report the failure instead.
7. **Stage deliberately.** Stage specific paths by name. Never use `git add .`, `git add -A` or `git add -u`.
8. **Review what you staged.** Run `git diff --staged` once more. Confirm no secrets (`.env`, keys, tokens, credentials) and no unrelated files.
9. **Write the message** using the convention below.
10. **Commit**, then report the resulting hash (`git rev-parse HEAD`) and re-check `git status` for anything left behind.

## Commit message convention

`type: short description` — imperative, lowercase, no trailing period, ideally under ~72 characters total.

| Type | Use for |
| ---- | ------- |
| `feat` | New functionality |
| `fix` | Bug fixes |
| `docs` | Documentation changes |
| `refactor` | Code restructuring with no behaviour change |
| `test` | Testing changes |
| `chore` | Maintenance, tooling, housekeeping |
| `perf` | Performance improvements |
| `security` | Security improvements |

Example: `feat: add memory timeline view`

A longer body is welcome when the "why" is not obvious — blank line after the subject, then wrapped explanation. Add an optional scope for large codebases (`feat(auth): ...`) only if the project already uses that style.

## Rules

- Never `git add .`, `git add -A` or `git add -u`.
- Never stage or commit unrelated files, generated artifacts, dependencies or build output.
- Never commit secrets, credentials or `.env` files.
- Never discard, overwrite, stash or revert changes you did not make.
- Never `git commit --amend`, `git reset`, `git rebase`, force-push or otherwise rewrite history without explicit authorization.
- Never push, tag or open a pull request unless explicitly authorized.
- Never commit failing code, skipped tests or suppressed errors to make a check pass.
- One commit per logical change; do not bundle unrelated work to save a step.
- Do not stage files as a side effect of any other task.

## Output

- **Commit message** — full message as committed.
- **Commit hash** — short and full.
- **Files included** — the exact paths.
- **Verification** — the checks run and their results.
- **Excluded** — anything deliberately left out, and why.
- **Follow-ups** — remaining uncommitted or unpushed work, if any.
