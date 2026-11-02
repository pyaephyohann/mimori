# Agent Workflow

The lifecycle every AI agent (and human contributor) follows when changing Mimori. It is binding together with the rules in [`AGENTS.md`](../AGENTS.md) and is supported by the six skills in [`.agents/skills/`](../.agents/skills/); see [Skill mapping](#skill-mapping) at the end of this document.

## 1. Understand project context

Read [`knowledge.md`](../knowledge.md), then the documents relevant to the task — at minimum [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [TECH_STACK.md](TECH_STACK.md). Check [DECISIONS.md](DECISIONS.md) so you do not contradict an accepted decision, and [FEATURES.md](FEATURES.md) for what actually exists.

Determine whether the requested work is consistent with the confirmed direction. Anything marked `TBD` is unplanned — treat it as a question, not as permission.

## 2. Inspect existing implementation

Read the code before changing it. Check the current branch and working tree state. Look for existing patterns, components, utilities and types to reuse. Verify every file, route, model and dependency you intend to rely on — never assume it exists. For framework APIs, consult the documentation shipped with the installed Next.js version.

## 3. Plan the requested task

State the smallest set of changes that fully satisfies the request. Identify what is explicitly out of scope. If the request would require a new dependency, a schema change, an architectural shift or a decision marked `TBD`, surface that rather than deciding silently. Break multi-step work into an explicit ordered plan.

## 4. Implement

- Make the smallest coherent change that fulfils the request.
- Follow the existing conventions, and the stack in [TECH_STACK.md](TECH_STACK.md).
- Reuse before adding; extend before duplicating.
- Keep unrelated files untouched, and do not edit configuration, dependencies, the Prisma schema or run migrations unless the task asks for it.
- Do not add unrequested features, abstractions or polish.

## 5. Test and verify

- Run the narrowest relevant check — typecheck, lint, build, or a targeted test — for the code you changed.
- Exercise the changed behaviour where a check can actually observe it.
- Re-run affected checks after any repair.
- If a check fails, fix the cause. Do not weaken assertions, skip tests, or suppress errors to make it pass.
- If something cannot be verified, say so explicitly.

## 6. Audit changes

Review your own diff before reporting:

- Does it contain only intended changes?
- Any leftover debug code, stray files, commented-out blocks or secrets?
- Does it contradict an accepted decision or an existing document?
- Did it accidentally touch application configuration, dependencies or unrelated files?

Fix what the audit finds.

## 7. Update documentation

Update the documents affected by the verified change, in the same task:

| If you changed… | Update |
| --------------- | ------ |
| Product scope or requirements | [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md), [DECISIONS.md](DECISIONS.md) |
| Architecture or system structure | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Dependencies or tooling | [TECH_STACK.md](TECH_STACK.md) |
| Data model or migrations | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| Feature status | [FEATURES.md](FEATURES.md) |
| Delivered work | [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) |
| A known problem or limitation | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) |
| Security-relevant behaviour | [SECURITY.md](SECURITY.md) |

Record only what is true. Never describe planned work as done.

## 8. Commit only with explicit authorization

Do not stage, commit or push unless the user explicitly asks for it. When authorized:

- Stage only the files belonging to this task — never broad `git add -A`.
- Leave changes you did not make alone.
- Write a clear message explaining why the change was made.
- Push only with separate, explicit authorization.

## 9. Report results

Report concisely and honestly:

- What changed and where.
- What was verified, and how.
- What could not be verified, and why.
- Any follow-up work or open questions.

Do not overstate completion.

## Skill mapping

Six reusable skills support these steps. Each has a single responsibility; none overrides `AGENTS.md`.

| Lifecycle step | Skill | Purpose |
| -------------- | ----- | ------- |
| 1–2. Understand context and inspect implementation | [`project-context`](../.agents/skills/project-context/SKILL.md) | Reads the instruction and documentation set, then verifies what actually exists in code. |
| 3–4. Plan and implement | [`feature-development`](../.agents/skills/feature-development/SKILL.md) | Scopes the requirement, plans, defines acceptance criteria and makes the scoped change. |
| 5. Test and verify | [`testing-verification`](../.agents/skills/testing-verification/SKILL.md) | Runs the project's real lint, typecheck, test and build commands plus targeted manual checks. |
| 6. Audit changes | [`code-audit`](../.agents/skills/code-audit/SKILL.md) | Independently reviews the diff for defects, security gaps and requirement fit. |
| 7. Update documentation | [`update-project-docs`](../.agents/skills/update-project-docs/SKILL.md) | Updates only the documents affected by verified work. |
| 8. Commit | [`git-commit`](../.agents/skills/git-commit/SKILL.md) | Inspects, stages selectively and commits — only with explicit authorization. |

Steps 9 (report) has no skill: reporting is described in [`AGENTS.md`](../AGENTS.md).

### How activation works

Skill selection is **automatic**: for each request the agent decides which of the six skills apply, using their `name` and `description` plus the orchestration policy in [`AGENTS.md`](../AGENTS.md#automatic-skill-selection-and-orchestration). Activating a skill means reading its `SKILL.md` and following it. There is no router, registry file or script involved — the skill files and the project instructions are the whole mechanism.

This is model-driven dispatch, not a deterministic engine. Skills are not guaranteed to load, to run in the intended order, or to run at all. When a skill cannot be read, say so and fall back to this workflow. A skill never overrides [`AGENTS.md`](../AGENTS.md).

For a typical new feature the automatic order is:

```text
project-context → feature-development → testing-verification
→ code-audit → update-project-docs → stop for approval
```

`git-commit` is appended only when the user explicitly requests or authorizes a commit; a finished workflow never implies authorization. The selection rules for each skill live in [`AGENTS.md`](../AGENTS.md#automatic-skill-selection-and-orchestration) and are not repeated here.

### Conditional activation

| Situation | Adjustments |
| --------- | ----------- |
| Bug fix | `feature-development` with root-cause investigation before the fix; record the regression check in `testing-verification` and the result in [KNOWN_ISSUES.md](KNOWN_ISSUES.md). |
| Database change | `project-context` must cover the schema; `feature-development` states migration impact; `testing-verification` checks data behaviour against a non-production database only; `update-project-docs` updates [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md). |
| Security-sensitive change | Add a dedicated `code-audit` pass focused on authorization, input handling and data exposure; record outcomes in [SECURITY.md](SECURITY.md). |
| UI change | `testing-verification` includes mobile-first and desktop checks; `code-audit` includes responsive and accessibility review. |
| Documentation-only task | `update-project-docs` directly, plus `project-context` only if the documents' accuracy depends on inspecting code. Skip implementation, verification and audit steps that do not apply. |

### Proportionate activation

Match the workflow to the change. A one-line fix does not need a formal plan, and an explanation question needs no skill at all. Skipping a skill because it does not apply is expected; skipping one that applies because it is inconvenient is not — say which were skipped and why.
