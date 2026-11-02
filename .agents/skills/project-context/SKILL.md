---
name: project-context
description: Builds accurate context for a task before any code is written by reading the project's instruction and documentation files, then verifying what actually exists in the repository. Use at the start of any task that changes, investigates or depends on existing behaviour, before planning or editing, and whenever architecture, feature status, decisions or conventions are uncertain. Not needed for general questions that do not touch this codebase.
metadata:
  version: "1.0"
---

# Project Context

Establish what the project is and what actually exists before planning or changing anything. This skill is **read-only**: loading context never modifies files.

## Steps

1. **Read the instructions.** Open `AGENTS.md` at the repository root, plus any nested `AGENTS.md` closer to the directory you will work in. Project instructions override anything in this skill.
2. **Read the short context file.** If `knowledge.md` exists at the root, read it for identity, stack, status and documentation index.
3. **Read the relevant documentation.** Start from the documentation index (`docs/README.md`). At minimum read:
   - `docs/PROJECT_OVERVIEW.md` and `docs/PRODUCT_REQUIREMENTS.md` — intent and scope.
   - `docs/ARCHITECTURE.md` and `docs/TECH_STACK.md` — how the system is built.
   Then read the documents specific to the area you were asked to change: features, schema, decisions, known issues, security. Skip documents that are irrelevant to the request.
4. **Check feature status.** Read `docs/FEATURES.md` so you know whether the thing you were asked for already exists, and at what status (`PLANNED` through `VERIFIED`).
5. **Review constraints.** Check `docs/DECISIONS.md` (accepted decisions you must not contradict), `docs/KNOWN_ISSUES.md` (known defects and workarounds) and `docs/SECURITY.md` (rules for the code you are about to touch).
6. **Inspect the code.** Verify rather than assume:
   - Read the files you intend to change.
   - Read their immediate neighbours: how similar pages, routes, components or queries are already written.
   - Confirm dependencies, scripts and configuration in `package.json` and the real project layout.
   - For framework APIs, consult the documentation shipped inside the installed package when the version is unfamiliar.
7. **Compare documentation with reality.** Where a document and the code disagree, the code and verified behaviour are the evidence of implementation. Record the discrepancy instead of trusting the document.
8. **Search for existing solutions.** Look for an existing helper, component, hook, route or type that already does what the task needs.

## Rules

- Never assume the documentation is fully up to date; verify the claims that affect your work.
- Treat verified code and behaviour — not prose — as proof that something is implemented.
- Do not modify files merely to complete context loading. Do not create placeholder files or "context" notes.
- Never read, print or expose `.env` files, credentials or other secrets.
- Do not install dependencies, run migrations or alter configuration in order to explore.
- If the request contradicts an accepted decision or confirmed direction, stop and raise it instead of proceeding.
- Keep this skill out of the writing path: no implementation happens here.

## Output

A short brief, not a file dump:

- **Relevant stack and structure** — the conventions the implementation must follow.
- **Existing implementation** — files and patterns found, with paths, including anything that already covers part of the request.
- **Relevant docs and status** — which documents and feature entries apply.
- **Conflicts and discrepancies** — code/documentation mismatches, and any request that contradicts a decision or known constraint.
- **Open questions** — anything genuinely ambiguous that blocks planning.

## Related

- Hand off to `feature-development` to plan and implement.
- If context loading reveals stale documentation, note it for `update-project-docs` rather than editing docs mid-task.
