# ADR-0016: `@simplewebauthn` carries the passkey flow, as an alternative single factor

- **Status:** proposed
- **Date:** 2026-09-14
- **Deciders:** Hugo Borsoni
- **Tags:** member-accounts-and-setlist-voting, auth, deps

## Context

ADR-0015 gives every member a password. The band reads this application on phones, standing
up, often in a rehearsal room, and typing a password there is the friction that decides
whether a vote gets cast. Passkeys remove it: the same thumb that unlocks the phone signs in.

WebAuthn is not a thing to hand-roll. The server side has to parse CBOR attestation objects,
validate an ES256 or RS256 signature over the authenticator data and a hash of the client
data, check the origin and the relying-party id hash, track the signature counter, and store
a credential id and public key. Every one of those steps is a place where a mistake is silent
and the result still appears to work.

The application runs on Hono in Lambda behind CloudFront, so the relying-party id differs per
stage: a preview host, and the production host. Whatever is chosen has to take that as
configuration.

## Decision

**Use `@simplewebauthn/server` on the API and `@simplewebauthn/browser` on the site, with
passkeys as an alternative single factor.** A member signs in either with their password or
with a passkey; neither is required, and the password remains the fallback when a device is
lost. Every outbound protocol concern lives in `passkey.adapter.ts`, per ADR-0012, and the
challenges live in a `webauthn_challenge` table rather than in memory, because Lambda gives
no shared process between the options call and the verify call.

## Consequences

- `+` Signing in on a phone costs one thumb, which is what makes a vote between two practices
  realistic at all.
- `+` The parsing and signature checks stay with a library that is maintained against the spec,
  rather than in this repository's test suite.
- `+` Losing a phone is not losing an account, because the password still works.
- `-` Two new runtime dependencies, one on each side, and the bundle on the site grows.
- `-` A passkey alone is a single factor, so a stolen unlocked phone is a signed-in session.
  For a band's song catalogue that is the right trade; for anything holding money it would not
  be.
- `-` The relying-party id has to be configured per stage, and getting it wrong produces
  passkeys that verify on preview and fail in production.
- `~` `webauthn_challenge` is a table whose rows are garbage after a minute. It needs a sweep,
  and the sweep is a delete of expired rows on each options call rather than a scheduled job.

## Alternatives considered

### Option A — `@simplewebauthn/server` and `@simplewebauthn/browser` (chosen)

- **Summary:** The de facto library pair for WebAuthn in TypeScript. Typed, framework-agnostic,
  no runtime beyond the Web Crypto API and CBOR parsing.
- **Strengths:**
  - Correctness of the parts that fail silently is not this repository's problem.
  - Relying-party id, origin and user verification are plain options, so the per-stage
    configuration is a value rather than a code path.
  - Isolates cleanly behind one adapter file, which is what ADR-0012 asks for.
- **Costs:** two dependencies, and a version bump is an auth-surface change rather than a
  routine one.
- **Rationale:** wins on correctness, which carries the highest weight, without losing on
  isolation.

### Option B — Hand-rolled WebAuthn verification (rejected)

- **Summary:** Parse the attestation and assertion in this repository, verify with Node's
  `crypto`.
- **Strengths:** No dependency, and full visibility into every check.
- **Costs:** Several hundred lines of protocol code whose failure mode is accepting an
  assertion it should reject. Testing it properly means building attestation fixtures for
  several authenticator shapes.
- **Rejection rationale:** loses on correctness by a wide margin. No weighting flips this: the
  cost of a subtle acceptance bug is an account takeover in an application with no recovery
  path.

### Option C — A hosted identity provider (Cognito, Clerk, Auth0) (rejected)

- **Summary:** Delegate accounts and passkeys entirely.
- **Strengths:** Neither passwords nor passkeys are stored here, and recovery flows come free.
- **Costs:** A third-party service, a second source of truth for who a member is, a redirect
  flow through an external origin, and a new account-to-member mapping to keep in sync with the
  `member` table that the lineups, the mastery scores and the votes all key on.
- **Rejection rationale:** loses on fit. `member` is already the identity this application is
  built around; an external one would sit beside it rather than replace it, and that seam would
  outlive the feature.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Correctness of the protocol checks | high | A wrong verification is silent, and this application has no account recovery. |
| One identity, the existing `member` | high | Lineups, mastery and votes key on `member.id`; a second identity store would need permanent reconciliation. |
| Isolation behind an adapter | medium | ADR-0012 puts every outbound call in an adapter file, and a swap later should touch one file. |
| Dependency count | low | The repository already carries a catalogued dependency set; two more is not the constraint. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Correctness of the protocol checks | ✓ maintained against the spec | ✗ ours to get right | ✓ vendor's problem |
| One identity, the existing `member` | ✓ credentials hang off `member_id` | ✓ same | ✗ external subject to map |
| Isolation behind an adapter | ✓ one adapter file | ✓ one adapter file | ✗ redirect flow reaches the site |
| Dependency count | ✗ two added | ✓ none | ✗ a service and its SDK |

## Implementation pointers

- Spec: [`docs/features/pragma/member-accounts-and-setlist-voting/spec/spec.md`](../features/pragma/member-accounts-and-setlist-voting/spec/spec.md)
- Plan: `docs/features/pragma/member-accounts-and-setlist-voting/plan/plan.md`
- Commit: pending
- Files: `apps/pragma/api/src/auth/passkey.adapter.ts`,
  `apps/pragma/api/src/auth/passkey.service.ts`,
  `apps/pragma/site/src/routes/account/AccountPage.tsx`
- Related ADRs: builds on ADR-0015; follows ADR-0012 for the adapter boundary.
