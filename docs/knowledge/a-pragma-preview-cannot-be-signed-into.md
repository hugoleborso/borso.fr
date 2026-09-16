# A pragma preview cannot be signed into

_Last verified: 2026-09-14 — against `pragma-pr-95-api.preview.borso.fr`, by
reading `auth.service.ts` and by probing `/api/auth/login` and
`/api/admin/set-password`._

Everything behind pragma's shared-password gate — catalog, setlists, mastery,
bars, members, sessions — is unreachable on a preview unless you already hold
the production password. This is not a bug in any one place; it is three
correct decisions meeting.

1. **The preview clones production.** `preview.yml` skips the seed for pragma
   with a comment that says why: the fixture seed wipes before it writes, and
   pragma's database is cloned from prod, so seeding would throw the clone
   away. See [`dsql-clone-from-prod.md`](./dsql-clone-from-prod.md).
2. **So the `app_config` row comes from production**, carrying production's
   scrypt hash.
3. **And bootstrap refuses an instance that already has one.**
   `bootstrapAuth` returns `already-bootstrapped` when `loadAppConfig()` is
   non-null, and `rotatePassword` sits behind `requireSharedPasswordSession`,
   so it needs the session you are trying to obtain.

The net effect: `POST /api/auth/login` answers `401 invalid-password` for every
password you can construct, and there is no unauthenticated path to change it.

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
- **On the preview.** Ask the operator for the shared password. There is no
  agent-reachable path.

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
