# ADR-0009 — pragma previews clone production, credentials included

- **Status:** accepted
- **Date:** 2026-08-09
- **Supersedes / relates to:** [ADR-0004](./0004-pragma-shared-password-auth.md) (shared-password auth), and the opposite call made for `last-loop-lepin` in `apps/last-loop-lepin/cdk/lib/stack.ts`

## Context

A pragma preview used to start from an empty schema and be filled by
`POST /api/__test/seed`, which writes a fixture: five instruments, four
invented members, a handful of songs. That is enough to prove the app renders
and nothing else. Reviewing a change against a catalogue of two hundred real
songs, real setlists and real mastery history is a different activity from
reviewing it against a fixture, and it is the activity the operator actually
wants a preview for.

`last-loop-lepin` already clones production into every preview for exactly this
reason. pragma did not, and the asymmetry was accidental rather than decided.

Two facts make the decision non-obvious:

1. **The repository is public.** Anyone can read `apps/` and the workflows.
2. **pragma holds personal data** — the band's members, their instruments,
   their rehearsal history. `last-loop-lepin`'s cloned data is race results
   that the production site publishes to spectators anyway; pragma's is not
   published anywhere.

So for pragma the *data* is the secret, and whatever protects the preview has
to be a real credential rather than a formality.

## Decision

Preview and integ schemas clone `prod`, with:

| | |
|---|---|
| `tableBlocklist` | `auth_attempt` — rate-limit counters, meaningless across schemas |
| `columnsToNullify` | `member.avatar_s3_key` — prod's key in the preview's bucket is a 404 |
| **cloned deliberately** | `app_config` — the shared password hash *and* the HMAC key |

Cloning `app_config` is the load-bearing part. It means **a preview's password
is production's password**.

The alternative was to blocklist it, as `last-loop-lepin` does with
`admin_credentials`, and give previews their own password. Every way of doing
that is worse here:

- **Hard-code one** (`pragma-preview`, as the fixture did) — the repository is
  public, so this is equivalent to publishing the band's data.
- **Put one in a GitHub secret** — a second credential to create, rotate and
  remember, protecting a copy of data the first credential already protects.
  More moving parts for no more security.
- **Generate one per preview** — it has to be delivered somewhere, and Actions
  logs on a public repository are public.

Production's own password is the only credential that is neither published nor
in need of distribution, and the people who may see preview data are exactly
the people who already know it.

The auto-seed is skipped for pragma, because `deleteAllDomainRows()` would
throw the clone away on every deploy. The workflow decides this by reading the
code — an app is skipped when its stack passes `cloneFromSchema` **and** its
seed calls `deleteAllDomainRows` — so `last-loop-lepin`, which clones but
upserts, keeps being seeded.

## Consequences

**Negative, and accepted.**

1. **Every preview database holds `hmac_key`, the symmetric key that signs
   session cookies.** A leaked preview database yields key material that would
   validate against production. This is the real cost of the decision. It is
   accepted because the alternative — a second shared credential, published or
   distributed — has a wider blast radius, and because `rotatePassword()`
   rerolls both the hash and the key if a preview is ever suspected.
2. **Personal data now sits in N preview databases** rather than one production
   database, and each is torn down on PR close rather than managed. The
   operator owns the data and has accepted this explicitly; it would not be an
   acceptable default for data belonging to someone else.

**Positive.**

3. Previews are useful for review, which is the entire point of having them.
4. No credential is hard-coded anywhere; deleting `SEED_ADMIN_PASSWORD`'s role
   in previews removes a published password that previously guarded fixture
   data and would have guarded real data the moment cloning was switched on.

**Guard rails.** `apps/pragma/cdk/test/stack.test.ts` pins both halves: prod
never clones (a self-clone is destructive), and the exclusion list cannot
shrink without failing a test.

## What would change this decision

If pragma ever holds data belonging to someone who has not agreed to it being
copied into previews — another band, a paying customer — the trade collapses
and previews should go back to a fixture, or to a pseudonymising
`columnsToNullify` on `member.first_name`.
