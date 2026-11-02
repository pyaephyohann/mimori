# Project Overview

## Identity

| Field | Value |
| ----- | ----- |
| Name | Mimori |
| Repository | `mimori` |
| Type | PWA-first web application |
| Status | Documentation-only. No application features implemented. |

## Description

> A cozy place to keep our date memories, anniversaries, silly moments and every little piece of our love story.

Mimori is a personal space for a couple to collect and revisit the small and large moments of their relationship: dates, anniversaries, everyday moments and the small things that would otherwise be forgotten.

The defining quality is the tone: **cozy, personal and calm**. It is not a productivity tool, a social network or a public publishing platform. It is a private keepsake.

## Vision and purpose

- Give a couple one warm place to keep their shared memories instead of scattering them across chats, photo galleries and notes.
- Make revisiting those memories effortless — the value is in returning to them, not only in storing them.
- Feel like an app you keep on your home screen: quick to open, pleasant to use, unobtrusive.

## Confirmed application direction

These points are decisions and constrain all future work:

1. **PWA-first.** The installable, app-like experience is the primary target. Web technology is the delivery mechanism, and the PWA experience is the product's first-class form.
2. **Mobile-first design.** Layouts, interaction and performance are designed for small touch screens first, then adapted for larger viewports.
3. **Responsive desktop support.** The application remains fully usable and well-presented on desktop and tablet.
4. **App-like experience** on devices that support installation.
5. **Functional web experience.** Mimori must still work as an ordinary website in a browser where installation is unsupported or declined. The web experience is not a degraded fallback.

## Explicitly not part of the confirmed scope

The following are often associated with PWAs but are **not** confirmed Mimori features. They must not be described as existing, planned or supported until they are decided and recorded in [DECISIONS.md](DECISIONS.md):

- Offline usage / offline data access.
- Push notifications.
- Background synchronization.
- Any other advanced PWA capability.

## Current state

Mimori is at the very beginning. The repository contains:

- A Next.js + TypeScript application scaffold with a single placeholder page.
- No product features, data model, authentication, API layer or PWA configuration.

For the feature-level truth, see [FEATURES.md](FEATURES.md). For requirements, see [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md). For the technical shape, see [ARCHITECTURE.md](ARCHITECTURE.md) and [TECH_STACK.md](TECH_STACK.md).
