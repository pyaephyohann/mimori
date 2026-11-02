# Security

Security principles and requirements for Mimori. This document describes intent and rules — **not** implemented controls. No security mechanism has been built yet.

## Current posture

Mimori is an early scaffold. The following **do not exist** yet:

- Authentication or accounts.
- Authorization rules.
- Session handling.
- Input validation or a mutation layer.
- Stored records. A Prisma schema exists and is applied to a local development database ([DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)), but it holds no user data and no production database is provisioned.
- Rate limiting.
- Security headers or a configured CSP.
- Secrets management for a deployed environment.
- Logging, monitoring or audit trails.

Because Mimori is intended to hold a couple's personal memories, most content will eventually be private by nature. Security is therefore a requirement of the product, not an optional hardening step.

## Principles

1. **Private by default.** A memory is personal data. Nothing should be readable by anyone who is not authorized, and there should be no accidentally public surface.
2. **Authorize on the server.** Every read and write is checked server-side. Client-side hiding of UI is never an access control.
3. **Never trust client input.** Validate and constrain all input on the server, with bound parameters for database access. Never build SQL by string concatenation.
4. **Least privilege.** Credentials, tokens and database roles get only the access they need. No broad administrative credentials in application runtime paths.
5. **Secrets stay out of the repository.** No keys, tokens or passwords in code, committed files, documentation, or client bundles. `.env*` files are git-ignored; only placeholder examples such as `.env.example` may be committed, and they contain no real values.
6. **Keep dependencies current and minimal.** Fewer dependencies mean a smaller attack surface; review before adding one, and update for security patches.
7. **Fail safely.** Errors must not leak secrets, stack traces or personal data to users.
8. **Secure transport.** Production traffic over HTTPS only; cookies, if used, must be `Secure`, `HttpOnly` and appropriately `SameSite`.

## Access model: one shared collection

The schema has **no ownership and no access control** ([D-013](DECISIONS.md)): no `User` model, no `userId` column, no authentication or authorization table. Every folder, photo, widget and widget selection belongs to the single shared Mimori collection, so anyone who can reach the application can read and change all of it.

This is an accepted product decision for a private keepsake used by one couple, not an oversight. The consequences that matter for security:

- **Deployment exposure is the control.** Because the app has no login, hosting must not make it publicly reachable. A public production deployment without an access-control decision is a defect, not a default.
- **No cross-record authorization checks are needed yet**, because there is no second principal to protect records from. Do not add speculative `where: { userId }` scoping to code.
- **If Mimori ever needs more than its two intended users**, access control is a new recorded decision and a schema migration, not an incremental patch.

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#global-architecture--no-ownership-model).

## Requirements for future work

| Area | Requirement | Status |
| ---- | ----------- | ------ |
| Authentication | A deliberate, recorded decision on approach (see [DECISIONS.md](DECISIONS.md)) | TBD |
| Authorization | Access control is intentionally absent ([D-013](DECISIONS.md)); a decision is required before any public deployment | TBD |
| Data protection | Encryption in transit; decide on encryption at rest | TBD |
| Secrets | Environment-based configuration, never committed | Requirement set, mechanism TBD |
| Input validation | Server-side validation on every mutation | TBD |
| Rate limiting | Protect auth and write endpoints | TBD |
| Dependency updates | Regular review of dependencies | TBD |
| Backups | Decide whether user data is backed up and how | TBD |
| Data deletion | Decide whether users can delete their data | TBD |
| Security headers / CSP | Evaluate and configure for the deployed app | TBD |
| Logging | Log security-relevant events without recording personal content | TBD |

## Rules for agents and contributors

- **Do not** read, print, log, commit or echo the contents of `.env` files, credentials or secrets.
- **Do not** put secrets in client-side code, documentation or test fixtures.
- **Do not** disable or weaken a security control to make a task pass; report the blocker instead.
- **Do not** claim a security control exists unless it is implemented and verified.
- **Do** record security-relevant decisions in [DECISIONS.md](DECISIONS.md) and add safeguards in the same change as the feature they protect.
- **Do** report any discovered exposure immediately and note it in [KNOWN_ISSUES.md](KNOWN_ISSUES.md) with severity.

## Reporting

There is no public disclosure process yet; it will be defined before Mimori handles real user data. Until then, security concerns should be raised with the project owner directly and not filed publicly.
