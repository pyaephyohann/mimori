# Mimori — Documentation

This directory holds the project documentation for **Mimori**. It is the reference point for humans and AI agents working on the project: what Mimori is, what has been decided, what exists today, and how work is expected to be done.

## Reading order

For a new contributor or agent:

1. [../knowledge.md](../knowledge.md) — one-page context.
2. [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) — what Mimori is and is not.
3. [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) — confirmed goals and requirements.
4. [ARCHITECTURE.md](ARCHITECTURE.md) and [TECH_STACK.md](TECH_STACK.md) — how the system is built.
5. [FEATURES.md](FEATURES.md) — what actually exists right now.
6. [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) — the required development lifecycle.

## Documentation map

| Document | Purpose |
| -------- | ------- |
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Project identity, description, vision and confirmed application direction. |
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | Confirmed product requirements and goals; undecided requirements marked `TBD`. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure and layering. Implementation details are pending. |
| [TECH_STACK.md](TECH_STACK.md) | Confirmed technologies with verified versions; undecided infrastructure marked `TBD`. |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Data model documentation. No models exist yet. |
| [FEATURES.md](FEATURES.md) | Feature tracking registry and status definitions. |
| [ROADMAP.md](ROADMAP.md) | Phased delivery plan. Future feature planning is `TBD`. |
| [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) | Chronological record of completed, verified work. |
| [DECISIONS.md](DECISIONS.md) | Log of accepted technical and product decisions with rationale. |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Known bugs, defects and limitations. |
| [SECURITY.md](SECURITY.md) | Security principles, requirements and current posture. |
| [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) | The development lifecycle agents must follow. |

## Rules for these documents

- Accuracy first: documentation describes the current state of the repository, not an intention.
- Confirmed decisions are stated as decided. Unsure or unplanned items are marked `TBD`. Never present an assumption as a decision.
- Features are never described as implemented unless the code exists and has been verified. See the status definitions in [FEATURES.md](FEATURES.md).
- Each fact lives in one document and is linked from others, to keep the set free of contradictions.
- Documents are updated in the same task that completes the work they describe.
- When a document contradicts the code, the code is the reality and the document is the bug — fix the document.

## Current documentation state

The documentation system was created before any application code. Most of it therefore describes a project that is planned rather than built: [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [ROADMAP.md](ROADMAP.md) and [FEATURES.md](FEATURES.md) are intentionally thin and will fill in as work is completed.
