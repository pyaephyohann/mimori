# Product Requirements

This document states what Mimori must do. It contains only confirmed requirements and explicit `TBD` items. Feature-level implementation status lives in [FEATURES.md](FEATURES.md).

## Product goals

| ID | Goal | Status |
| -- | ---- | ------ |
| G-1 | Provide a cozy, personal place where a couple can keep their shared memories. | Confirmed |
| G-2 | Make stored memories pleasant and easy to revisit. | Confirmed |
| G-3 | Deliver an installable, app-like experience as the primary form of the product. | Confirmed |
| G-4 | Remain fully usable as a normal website in a browser. | Confirmed |

## Confirmed requirements

### Platform and delivery

| ID | Requirement |
| -- | ----------- |
| R-1 | Mimori is a **PWA-first web application**. The installable experience is the primary target. |
| R-2 | The web application must be installable on compatible mobile and desktop devices. |
| R-3 | The application must remain functional in a standard browser without installation. |
| R-4 | The product must be designed **mobile-first**, with responsive support for tablet and desktop. |
| R-5 | The application should feel app-like on compatible devices (native-feeling navigation, layout and interaction), not like a generic marketing site. |

### Content

| ID | Requirement |
| -- | ----------- |
| R-6 | The product must accommodate the content named in the project description: date memories, anniversaries, silly moments, and other pieces of the couple's story. |

Photo support is confirmed: a private gallery, folders, widgets that display selected photos, and a dedicated Photo Booth section, with images stored in Cloudinary ([D-011](DECISIONS.md), [D-012](DECISIONS.md)). Other memory types, video/audio media, and entry structures remain **TBD** — see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### Engineering

| ID | Requirement |
| -- | ----------- |
| R-7 | The application is built with Next.js and TypeScript. |
| R-8 | Persistence uses Prisma with PostgreSQL. |
| R-9 | The project maintains living documentation under [`docs/`](README.md), updated when verified work lands. |

## Undecided requirements (TBD)

None of the following has been decided. Do not implement or assume any of them without an explicit request and a new entry in [DECISIONS.md](DECISIONS.md).

| Area | Open question | Status |
| ---- | ------------- | ------ |
| Access model | Is Mimori single-couple (one shared space) or multi-user with accounts? | TBD |
| Authentication | What sign-in method and provider are used? | TBD |
| Memory types | Which entry types exist (dates, anniversaries, notes, photos, milestones, …)? | TBD |
| Media | Photos — confirmed, stored in Cloudinary and referenced from PostgreSQL; video/audio support and size limits | Partly decided ([D-011](DECISIONS.md)); limits TBD |
| Sharing | Can memories be shared publicly or with others? | TBD |
| Reminders | Are reminders or notifications wanted? | TBD |
| Search and browsing | Chronological timeline, calendar, tags, search? | TBD |
| Offline behaviour | Is offline access required? (Not a confirmed feature.) | TBD |
| Data export | Can users export or delete all of their data? | TBD |
| Hosting | Where is the application deployed? | TBD |
| Analytics / monitoring | Are any used? | TBD |
| Accessibility target | Specific conformance level? | TBD |

## Out of scope

- Social networking, feeds, or public discovery.
- Any advanced PWA capability (offline, push notifications, background sync) until it is explicitly confirmed.
- Anything not stated above.
