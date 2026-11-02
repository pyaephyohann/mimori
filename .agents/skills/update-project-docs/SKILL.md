---
name: update-project-docs
description: Updates the project's living documentation after implementation changes are complete and verified, covering feature status, development log, schema, architecture, stack, decisions, known issues and security. Use after verified work lands, when a bug or decision is recorded, or for documentation-only tasks where no implementation steps are needed.
metadata:
  version: "1.0"
---

# Update Project Docs

Keep the documentation true to the code. Documentation is part of the definition of done: a change that alters behaviour, structure or intent is not finished until the documents describing it are updated in the same task.

## Steps

1. **Confirm the work is done.** Only document completed work. If something was attempted but not finished, it does not get logged as done.
2. **List what actually changed.** Read the real diff — files added, modified and removed — not your memory of the task.
3. **Select only the affected documents** using the table below. Skip the rest; unrelated edits create noise.
4. **Update each document** in its existing style, preserving structure and history. Extend sections instead of rewriting them, and never delete earlier log entries.
5. **Check cross-references.** If a document moved, was renamed or gained a section others link to, fix the links.
6. **Re-read your edits** against the code to confirm every statement is true.

## Which document to update

| What changed | Document |
| ------------ | -------- |
| Feature status, scope or completion | `docs/FEATURES.md` |
| Meaningful completed development work | `docs/DEVELOPMENT_LOG.md` |
| Models, fields, relationships, indexes or migrations | `docs/DATABASE_SCHEMA.md` |
| Application structure, layering, rendering or data-access approach | `docs/ARCHITECTURE.md` |
| Dependencies, tooling, verified versions or infrastructure | `docs/TECH_STACK.md` |
| An accepted technical or product decision | `docs/DECISIONS.md` |
| A defect or limitation found, fixed or made irrelevant | `docs/KNOWN_ISSUES.md` |
| Security posture, requirements or controls | `docs/SECURITY.md` |
| Roadmap priorities that genuinely changed | `docs/ROADMAP.md` |
| Project-wide context, stack summary or status | `knowledge.md` |

If the project names these files differently, follow the index in `docs/README.md` and the conventions in `AGENTS.md`.

## Feature statuses

Use exactly these values in `docs/FEATURES.md`:

- `PLANNED` — agreed as needed, not started.
- `IN_PROGRESS` — actively being built; not usable end to end.
- `IMPLEMENTED` — code exists and works, but its behaviour has not been verified against requirements.
- `VERIFIED` — built **and** checked; the behaviour was exercised and confirmed.
- `BLOCKED` — cannot proceed due to an unresolved dependency or decision.
- `DEPRECATED` — still present but no longer supported; scheduled for removal.

Never move a feature into `VERIFIED` without having actually verified it, and never skip straight from `PLANNED` to `IMPLEMENTED`.

## Rules

- Never claim a feature is complete without verification. State what was checked, or mark it `IMPLEMENTED`.
- Never fabricate history: no invented dates, commit hashes, test results, migrations or environments.
- Never invent models, endpoints, environment variables or integrations in the schema or stack documents.
- Use `TBD` for undecided information and keep it distinguishable from decisions.
- Update only the documents affected by the change; do not rewrite unrelated documentation or reformat untouched files.
- Avoid duplication: state a fact once in its home document and link to it from elsewhere.
- Include useful implementation references — file paths, function or model names, the command used to verify — where they help a reader trust the entry.
- Do not edit source code while doing this; report anything that needs a code change instead.

## Output

- **Updated documents** — each file with a one-line explanation of what changed.
- **Not updated** — documents deliberately left alone, with the reason when it is not obvious.
- **Unverified claims withheld** — anything that could not be documented honestly yet.
