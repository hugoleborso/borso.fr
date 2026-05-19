# ADR-0004: Shared-password auth for the pragma band ERP

- **Status:** proposed
- **Date:** 2026-05-19
- **Deciders:** Hugo, tech-lead-orchestrator (run `2026-05-19-1937-pragma`)
- **Tags:** pragma, auth, security

## Context

`pragma.borso.fr` serves five named musicians — Hugo, Gui, Arn, Cosyn, Emma — and nobody else. The app holds the band's internal working set: song catalog, setlists, mastery matrix, bar contacts, draft chord charts. There is no billing, no PII beyond a first name + colour, no external integration that authenticates on behalf of a member. The tool is a daily-use companion: at rehearsal it is opened on five phones at once, on stage it is the chord-chart viewer in *Mode Scène*. The friction of a login flow is paid every session, by every member.

The other borso apps set the convention this decision diverges from: `last-loop-lepin` ships individual JWT + scrypt-hashed PIN (the runners need attributable punches), `borso-fr` and `borsouvertures` are fully public. Pragma is the first deliberately-narrow private surface in the repo. The choice here is "the lightest scheme that still keeps the band's catalog off the open web" — not "the most secure auth we can build".

The spec's *Open questions for the designer pass → resolutions* and Q.O.D. row "Auth model" frame the trade-off: per-user accounts (with audit) vs a single team-wide password.

## Decision

**Shared-password authentication.** A single team-wide secret, stored as an **argon2id** hash in CDK secrets, gates the entire app. POST `/api/auth` accepts the plaintext password, compares against the stored hash, and on success sets a **signed `HttpOnly` cookie** with `SameSite=Strict` and a 30-day TTL. The middleware validates the cookie's HMAC signature on every subsequent request. Failed attempts are rate-limited per `ip_hash` (5 attempts / 15 min). The five members share one secret, rotated by Hugo when needed — rotation invalidates every cookie by rotating the HMAC signing key alongside the password hash. Per-user identity exists in the data model (the `Member` row carries the name and colour), but the auth layer does not bind a session to a particular member — any authenticated client is "the band". Picked over individual accounts because friction at access (paid 5×/session) dominates over attribution (which a 5-person team can resolve out-of-band). Picked argon2id (over scrypt or bcrypt) for memory-hardness + current best-practice; picked HttpOnly cookie (over a JS-readable JWT) for XSS-resistance, since pragma is single-origin and the JWT's local-introspection advantage is solvable with a non-secret `last-login` timestamp in `localStorage`.

## Consequences

- `+` Single secret to rotate when a phone is lost — no per-user provisioning, no password-reset flow to build.
- `+` Onboarding is one Slack message ("password is X") — no signup screen, no email verification, no recovery questions.
- `+` The mobile login flow stays one input field, which matches the design bundle's `auth` screen as-is.
- `-` **No per-user audit.** Destructive mutations (delete song, drop a setlist entry) cannot be attributed in the application log. Forensic reconstruction relies on "ask the band on Slack".
- `-` **Rotation cost is band-wide.** Changing the password forces every device to re-authenticate the same evening. A leak via a stolen phone implies a rotation that pages all five members.
- `~` Failed-login logs carry `ip_hash` rather than a user identifier — useful for rate-limit tuning, not for individual accountability.
- `~` If pragma later grows a billing surface or external integration, this ADR's chosen path is no longer defensible — supersede with an ADR introducing individual accounts.

## Alternatives considered

### Option A — Shared password (chosen)

- **Summary:** One team-wide secret stored as an **argon2id** hash in CDK secrets (`PRAGMA_BAND_PASSWORD_HASH`), alongside a separate HMAC signing key (`PRAGMA_SESSION_HMAC_KEY`). POST `/api/auth` accepts a plaintext password, verifies via `argon2.verify`, on success sets a signed `HttpOnly; Secure; SameSite=Strict` session cookie with 30-day TTL. Subsequent requests carry the cookie automatically; the middleware re-verifies the HMAC. Rotation = rotate both secrets together in CDK, redeploy, every device re-auths. Rate-limited by `ip_hash` (5 attempts / 15 min).
- **Strengths:**
  - One input on login (matches the design bundle's mobile auth screen 1:1).
  - Zero provisioning surface — no user table, no password-reset flow, no email verification.
  - Lifecycle owned by Hugo: rotate by updating a CDK secret + redeploying, no application state migration.
- **Costs:**
  - 0 USD/month — re-uses the existing CDK secrets plumbing.
  - Sacrifices per-user attribution. Estimated cost: < 4 disputes per year given the 5-person scale; resolution by Slack, not by app log.
  - Single leak = band-wide re-auth (annoyance, not exposure — no PII to leak).
- **Rationale:** At five members on a daily-use tool, friction at access is the dominant axis. The spec's framing ("5 known people, audit not needed, friction tax of per-user login wasted on this scale") matches the rubric: shared password wins on friction (high weight) + operator overhead (medium weight), loses on attribution (low weight) + leak isolation (medium weight). Net win.

### Option B — Individual accounts (rejected)

- **Summary:** Per-member account row in `pragma.member_auth` (email + argon2id PIN hash + recovery flow). Sessions bind to a `member_id`; every mutation log carries the author. Mirrors the per-user shape `last-loop-lepin` ships (the latter uses scrypt for its PIN; this option assumes the more modern argon2id for consistency with the chosen path).
- **Strengths:**
  - Per-user attribution on every write — `member_id` foreign-key on every audit row, no Slack archaeology.
  - Compromise contained to one user — revoke a single PIN without paging the band.
  - Sets up cleanly for future features (per-user preferences, per-user offline cache scoping).
- **Costs:**
  - 5× the provisioning paid up-front: signup screen, email verification, password reset flow, account-recovery email template, `member_auth` table + Drizzle schema.
  - Friction at access: five members type a 6-digit PIN every time the session expires (~hourly on mobile Safari). Estimated 5 × ~8 sessions/week × 3-5 s = 2–3 minutes of band-wide friction per week, every week.
  - The repo would carry two auth schemes (this one + `last-loop-lepin`'s); knip would not flag the duplication.
- **Rejection rationale:** Loses on **friction at access** (high) and **operator overhead** (medium). The criteria where Option B wins — attribution and leak isolation — are weighted low / medium respectively because the band has alternative channels (Slack, last-write-wins on every entity) to resolve those concerns. Flipping the decision would require the band to grow beyond five trusted members, or pragma to start holding sensitive data (billing, PII, external API keys). Both are explicit *Out of scope* items in the spec.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Friction at access | high | Daily-use tool for 5 musicians. Login latency is paid 5× per session, every session, by the same people. The spec's auth row names this explicitly: "friction tax wasted on this scale". |
| Per-action attribution | low | 5 trusted humans + last-write-wins concurrency (cf. spec Q.O.D. "Concurrency"). Slack resolves disputes faster than an app audit log would. The spec's *Out of scope* list explicitly excludes a per-user audit trail. |
| Resistance to credential leak | medium | The URL is public; the password is the only gate. But no PII / billing / external integrations means a leak inconveniences (band-wide rotation) but does not expose users. |
| Operator overhead | medium | Hugo is the sole operator. Provisioning, password reset, account recovery — every flow costs hours that don't ship music. The simpler the lifecycle, the less the tool taxes the band. |

|                         | Shared password (chosen) | Individual accounts (rejected) |
|---|---|---|
| Friction at access | ✓ one secret, no signup, no per-user PIN | ✗ 5 PINs to type / recover / forget |
| Per-action attribution | ✗ no `member_id` on mutation logs | ✓ every write tagged to a member |
| Resistance to credential leak | ✗ leak = band-wide rotation | ✓ revoke one PIN, others unaffected |
| Operator overhead | ✓ rotate one secret in CDK, redeploy | ✗ user table + reset flow + recovery template |

The rubric differentiates: shared wins 2/4 on the highest-weighted criteria; individual wins 2/4 on the lower-weighted ones. The decision flips only if the band exceeds five trusted members, or pragma starts holding sensitive data.

## Implementation pointers

- Spec: [`docs/features/pragma/first-features/spec/spec.md`](../features/pragma/first-features/spec/spec.md) — Q.O.D. row "Auth model", *Zero-defect strategy* section (`ip_hash` rate-limit), and *Out of scope* item "Per-user audit trail (shared password)".
- Plan: `docs/features/pragma/first-features/plan/plan.md` — auth-middleware row (to be added in stage `plan`).
- Commit: stamped by `/after-task-dantotsus` on merge.
- Files (anticipated, written under `/implementation` — names not contractual, the `/implementation` agent may pick neighbouring paths):
  - `apps/pragma/api/src/auth/shared-password.middleware.ts` — Hono middleware verifying the signed cookie's HMAC and (on POST `/api/auth`) the argon2id password hash.
  - `apps/pragma/api/src/auth/rate-limit.utils.ts` — per-`ip_hash` token bucket, 100% coverage.
  - `apps/pragma/cdk/lib/pragma-stack.ts` — `PRAGMA_BAND_PASSWORD_HASH` + `PRAGMA_SESSION_HMAC_KEY` secrets + Lambda env wiring.
- **Caveat on the rubric** (added 2026-05-19 after tech-lead audit): the criteria + weights table below was inferred by the orchestrator from the spec's framing prose; it was not separately ratified by Hugo at ADR-creation time. The ratification we have is on the binary "shared password vs individual accounts" — the relative weights are the orchestrator's reading. If the weighting feels off in retrospect, supersede via a Revision block or a new ADR rather than silently editing this one.
- Related ADRs: none directly. Contrast point with `last-loop-lepin`'s JWT + PIN (no ADR — that app pre-dates the ADR convention; if revisited, this ADR is the precedent for "lighter auth when the user set is small and trusted").
