---
summary: 'A pragma preview clones production''s credentials, so only someone holding a production account signs in; validate sign-in locally instead.'
triggers:
  commands:
    - 'pragma-pr-\d+(-api)?\.preview\.borso\.fr'
---

# A pragma preview cannot be signed into

_Last verified: 2026-10-05 — by reading `apps/pragma/cdk/lib/stack.ts` and
`auth/credentials.service.ts`._

A pragma preview is signed into with production's credentials, which an agent
does not hold. This is deliberate ([ADR-0009](../adr/0009-pragma-previews-clone-production.md)).

1. **The preview clones production.** `preview.yml` skips the seed for pragma,
   because the fixture seed wipes before it writes and would throw the clone
   away. See [`dsql-clone-from-prod.md`](./dsql-clone-from-prod.md).
2. **`app_config` and `member_credential` are cloned and replaced on every
   deploy**, so the group password and each member's own password are
   production's.
3. **Passkeys are not cloned.** A passkey is bound to production's
   relying-party id and cannot sign into a preview host.

Between 2026-09-14 (commit `03bd354`) and 2026-10-05 both credential tables
were blocklisted instead, so a preview had no credential at all and answered
every login and recovery with `503 auth-not-bootstrapped`, shown as
*L'application n'est pas encore initialisée*.

## What can still be tested on a pragma preview

More than it looks like, because the public surface is the part that a
dependency bump is most likely to break:

- `GET /api/health`.
- `POST /api/auth/login` with a malformed body — the `zValidator` 400 path,
  which returns the `SafeParseError` shape the front end's response types now
  carry.
- `POST /api/auth/login` with a wrong password — 401, and it proves the
  credential read against DSQL works.
- Any gated route uncookied — `401 session-required`, which proves the
  middleware is mounted.
- The login screen itself, end to end: a wrong password exercises the mutation,
  the `isResponseSuccessful` narrowing, `ApiError`, and the error UI.

That was enough to validate the hono, zod-validator and drizzle upgrades in
PR #95 on the preview. The authenticated **screens** were not covered there,
and were driven locally instead.

## If you need the authenticated screens

Two options, in order of preference:

- **Locally.** `scripts/local-postgres.sh`, then seed and write your own
  credential row. This is what PR #95 did for last-loop-lepin's admin forms.
- **On the preview.** The operator signs in with their production account.
  There is no agent-reachable path.

`last-loop-lepin` is not in the same position: its seed only upserts, so its
preview is seeded with a fixture — but the seed does **not** write an
`admin_credentials` row either, so its admin screens have the same gap for the
same practical reason.

## See also

- [`dsql-clone-from-prod.md`](./dsql-clone-from-prod.md) — why the preview
  carries production rows in the first place.
- [`a-preview-host-answers-after-its-stack-is-gone.md`](./a-preview-host-answers-after-its-stack-is-gone.md)
  — the other reason a preview can look alive and not be testable.
- [`fresh-prod-bootstrap-503.md`](./fresh-prod-bootstrap-503.md) — the opposite
  end of the same state machine, when there is no config row at all.
