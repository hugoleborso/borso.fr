# ADR-0015: Per-member credentials replace the shared password, behind a self-closing enrolment window

- **Status:** proposed
- **Date:** 2026-09-14
- **Deciders:** Hugo Borsoni
- **Tags:** member-accounts-and-setlist-voting, auth, data

## Context

`pragma` authenticates one secret, not a person. `app_config` holds a single argon2id hash
and an HMAC key, the `pragma_session` cookie carries only issue and expiry times, and every
domain router opens with `requireSharedPasswordSession`. The setlist voting feature needs to
know which of the five members is asking, because a vote is per member and a budget is per
member. Nothing in the current model can answer that question, and nothing in it can be made
to answer it without a second notion of identity.

Two constraints close doors before the trade-off starts. Aurora DSQL accepts
`ADD COLUMN name type` and no constraint clause, so a credential cannot be bolted onto
`member` as a `NOT NULL` column; it needs a table of its own. And there is no mail path in
this application, so no enrolment or recovery flow can send anything to anyone.

The question is what happens to the shared password on the day the accounts land, and how the
first account comes into existence when nobody has one.

## Decision

**Replace the shared password, and let it open a self-closing enrolment window on its way
out.** Per-member credentials live in `member_credential`; the session cookie payload carries
a member id and that member's session epoch; every router gates on `requireMemberSession`.
`POST /api/auth/enrol` is the one route the old shared password still opens: a member claims
their name and sets a password. The route refuses with `enrolment-closed` once every member
holds a credential, so the old path removes itself without a deploy, a flag, or a date.

## Consequences

- `+` One authentication path to reason about and to test, rather than two levels of access
  that every future route would have to choose between.
- `+` Nobody is locked out at deploy time, and no temporary password has to be handed out over
  a side channel.
- `+` The old path's lifetime is a property of the data, not of an operator's memory.
- `-` Every cookie issued before the change stops verifying, because the payload shape changed.
  The whole band signs in again once. This is an observable property regression and it belongs
  in the commit body.
- `-` A member added after the window has closed cannot self-enrol. Another member creates
  their credential, which is acceptable only because every member is an admin.
- `-` There is no recovery when a member loses their password and every passkey. Another member
  resets it; if that is ever untrue, this ADR needs revisiting.
- `~` `app_config.password_hash` stays in the table, read by exactly one route. DSQL cannot drop
  a column, so the row outlives its use, as `setlist` already does.

## Alternatives considered

### Option A — Replace, with a self-closing enrolment window (chosen)

- **Summary:** Credentials per member, shared password accepted on the enrolment route only,
  route disabled by the data once everyone is enrolled.
- **Strengths:**
  - One gate, one session shape, one thing to test.
  - Deploys without coordination: the band enrols itself at its own pace.
  - The transition ends observably, which a reviewer can assert in a test.
- **Costs:**
  - A window during which the old secret still grants something, bounded by five enrolments.
  - One forced re-login for everyone.
- **Rationale:** it wins on the two criteria that carry weight here, a single gate and no
  lock-out, and it pays for them with a bounded window rather than a permanent second path.

### Option B — Migration seeds a credential per member with a temporary password (rejected)

- **Summary:** The migration writes five rows with generated passwords and a must-change flag;
  the operator distributes them once.
- **Strengths:** The shared password dies at the deploy, with no window at all.
- **Costs:** Five secrets travel over a side channel this application does not own, and a
  member who never receives theirs is locked out with no self-service route back.
- **Rejection rationale:** loses on no-lock-out. Raising the weight of "the old secret must die
  immediately" would flip it, and nothing in this band's threat model raises that weight.

### Option C — Keep the shared password beside the accounts (rejected)

- **Summary:** Shared password keeps opening the read-only surface; accounts exist only where a
  member identity is needed.
- **Strengths:** Smallest diff, and the stage and scene screens keep working with a secret
  anyone can type.
- **Costs:** Two middlewares and two session shapes, permanently. Every future route has to
  pick one, and picking wrong is a silent authorisation bug.
- **Rejection rationale:** loses on the single-gate criterion, which is the highest-weighted
  one, and the cost is unbounded in time rather than bounded by five enrolments.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| One gate for every route | high | Two session notions make every future route an authorisation decision, and CLAUDE.md's "Preexisting is not an excuse" makes that a debt nobody gets to walk past. |
| Nobody locked out at deploy | high | No mail path, no recovery, five people. A lock-out has no automated remedy. |
| Transition ends without an operator action | medium | The repo already carries a dantotsu about a gate that existed only in a comment; a window that closes by memory is the same failure. |
| Size of the diff | low | This feature is already a rewrite of the auth slice. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| One gate for every route | ✓ one gate after the window | ✓ one gate immediately | ✗ two gates forever |
| Nobody locked out at deploy | ✓ self-service | ✗ depends on a side channel | ✓ nothing changes for readers |
| Transition ends without an operator action | ✓ closes on the data | ✓ nothing to close | ✗ never ends |
| Size of the diff | ✗ enrolment screen and route | ✓ a migration | ✓ smallest |

## Implementation pointers

- Spec: [`docs/features/pragma/member-accounts-and-setlist-voting/spec/spec.md`](../features/pragma/member-accounts-and-setlist-voting/spec/spec.md)
- Plan: `docs/features/pragma/member-accounts-and-setlist-voting/plan/plan.md`
- Commit: pending
- Files: `apps/pragma/api/src/auth/shared-password.middleware.ts`,
  `apps/pragma/api/src/auth/session-cookie.utils.ts`,
  `apps/pragma/api/src/auth/auth.schema.ts`, `apps/pragma/api/src/app.ts`
- Related ADRs: ADR-0016 builds on this one.
