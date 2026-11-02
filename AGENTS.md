<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Instructions — Mimori

Permanent instructions for AI coding agents working in this repository. These rules apply to every task, in every session.

## 1. Read before you build

Before writing any code:

1. Read [knowledge.md](knowledge.md) for project context.
2. Read the documentation relevant to the task from [docs/README.md](docs/README.md) — at minimum [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [TECH_STACK.md](docs/TECH_STACK.md).
3. Check [FEATURES.md](docs/FEATURES.md) to see what actually exists.
4. Check [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) and [DECISIONS.md](docs/DECISIONS.md) for constraints already agreed.

Treat the documentation as the project's source of truth for intent and status. The `project-context` skill in section 10 performs this pass.

## 2. Inspect existing code first

- Read the files you intend to change before changing them.
- Look for existing utilities, components, types and conventions that already solve part of the problem.
- Never assume a file, dependency, model or route exists. Verify it.
- Respect the Next.js version in this repository: check the guides in `node_modules/next/dist/docs/` when an API or convention is uncertain.

## 3. Avoid duplicate functionality

- Search the codebase before adding a helper, component, hook or route.
- Extend or refactor an existing implementation instead of adding a parallel one.
- If a genuine duplicate already exists, resolve it as part of the task and record the decision.

## 4. Respect the existing architecture

- Follow the documented structure in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Follow the stack in [docs/TECH_STACK.md](docs/TECH_STACK.md). Do not introduce a new framework, database, state manager or styling system without an explicit request.
- Match existing naming, file layout, formatting and lint conventions.
- Keep changes inside the boundaries of the requested task.

## 5. Never invent implementation status

- Documentation must describe what is true right now.
- Do not describe a feature as implemented, verified or deployed unless the code exists and the behaviour has been checked.
- Do not invent database models, endpoints, environment variables, integrations, commit hashes or test results.
- Use `TBD` for anything undecided, and `PLANNED` for anything intended but not built.

## 6. Keep changes within the requested scope

- Do the requested work completely; do not add unrequested features, refactors, dependencies or polish.
- Do not modify unrelated files.
- Do not install dependencies, change configuration, alter the Prisma schema or run migrations unless the task explicitly asks for it.
- Never read, print or commit the contents of `.env` files or other secrets.

## 7. Update documentation after verified work

After a feature is complete **and verified**, update in the same task:

- [docs/FEATURES.md](docs/FEATURES.md) — status and scope.
- [docs/DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md) — what changed and how it was verified.
- [docs/DECISIONS.md](docs/DECISIONS.md) — any architectural or product decision made.
- [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) — if the schema changed.
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — new known limitations.

Do not log unverified or partially finished work as done.

## 8. Git safety

- **Never commit without explicit authorization.**
- **Never push to a remote without explicit authorization.**
- Do not stage files as a side effect of other work.
- Do not rewrite history, force-push, reset, or delete branches.
- Never discard changes you did not make.

## 9. Report honestly

When a task ends, state what was done, what was verified and how, and anything that could not be checked. Report failures as failures.

## 10. Available skills

Six reusable skills live in [`.agents/skills/`](.agents/skills/), one responsibility each:

| Skill | Activate when |
| ----- | ------------- |
| [`project-context`](.agents/skills/project-context/SKILL.md) | At the start of every task, and whenever existing behaviour, architecture or feature status is uncertain. |
| [`feature-development`](.agents/skills/feature-development/SKILL.md) | Implementing, changing or fixing application behaviour. |
| [`testing-verification`](.agents/skills/testing-verification/SKILL.md) | After implementation, before audit or commit. |
| [`code-audit`](.agents/skills/code-audit/SKILL.md) | Before a feature is accepted as complete, or when a review is requested. |
| [`update-project-docs`](.agents/skills/update-project-docs/SKILL.md) | After verified work lands, or for documentation-only tasks. |
| [`git-commit`](.agents/skills/git-commit/SKILL.md) | Only when the user explicitly authorizes a commit. |

Intended order:

```text
user request → project-context → feature-development → testing-verification
            → code-audit → update-project-docs → git-commit (authorized only)
```

**Selection is automatic by default.** For every request, decide which skills apply using [Automatic Skill Selection and Orchestration](#automatic-skill-selection-and-orchestration) below, rather than waiting for the user to name one. Activation itself is model-driven, not a deterministic router: skills are never guaranteed to load or to run in sequence, so state which ones you used. A skill never overrides this file: where they conflict, these rules win. Conditional activation (bug fixes, database, security-sensitive and UI changes, documentation-only tasks) is detailed in [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md). The Git authorization rules in section 8 apply unchanged to `git-commit`.

## Automatic Skill Selection and Orchestration

Skills are invoked through Freebuff's native mechanism only: each skill is a `SKILL.md` file whose `name` and `description` are its discovery surface, and "activating" a skill means reading that file and following it. There is no router, registry file, script or hook to configure — do not add one.

Before starting any work:

1. **Analyze the request.** What is being asked, and which parts of the project does it touch?
2. **Identify the relevant skills** using the selection rules below.
3. **Activate them automatically.** Read each relevant `SKILL.md` and follow it. Do not ask the user to name a skill.
4. **Combine skills** when the task spans several responsibilities; a development request normally needs more than one.
5. **Coordinate their handoffs** in the order given below, so each skill does its own job instead of duplicating another's.
6. **Skip irrelevant skills.** Do not load all six for every request; a question is not a feature.
7. **Do not ask the user to choose a skill** when the request already determines the answer. Ask only if the request is genuinely ambiguous and the choice would materially change the work.
8. **Disclose failures.** If a skill cannot be read or applied, say so plainly and continue with the workflow in this file and [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md). Never imply a skill ran when it did not.

### Selection rules

| Skill | Activate when |
| ----- | ------------- |
| `project-context` | Starting a feature or bug fix; investigating existing behaviour; changing architecture, database or application structure; the task depends on earlier project decisions. |
| `feature-development` | Creating a feature; modifying existing functionality; fixing a bug that needs code changes; refactoring requested functionality. |
| `testing-verification` | Code or configuration changes need verification; a feature or fix is complete; the user asks for tests or verification. |
| `code-audit` | A feature or fix has been implemented; the user asks for an audit or security review; the change has significant security, database, authorization or architectural impact. |
| `update-project-docs` | Verified changes affect documentation; a feature is implemented or its status changes; architecture, schema, security or known issues change. For documentation-only requests, activate this skill directly and skip implementation skills. |
| `git-commit` | **Only** when the user explicitly asks for a commit or explicitly authorizes a proposed one. |

Completing implementation, verification, audit and documentation is **not** authorization to commit. Never commit automatically, and never push without explicit permission.

### Default workflow for a new feature

```text
project-context → feature-development → testing-verification
→ code-audit → update-project-docs → stop and wait for approval
```

`git-commit` joins that chain only on an explicit request. For bug fixes, use the same workflow when applicable and keep the scope proportional to the change.

For simple questions, explanations, brainstorming and other non-development requests, do not activate the development workflow.

### Safety invariants (unchanged)

Orchestration never loosens sections 5–8:

- Do not expand the user's requested scope, and never invent requirements or implementation status.
- Never read, print or commit `.env` files or other secrets.
- Preserve unrelated user changes.
- Do not run destructive database commands without explicit authorization.
- Do not commit, amend, reset, rewrite history or push without the required explicit authorization.
- Report skipped checks and unavailable skills honestly.
