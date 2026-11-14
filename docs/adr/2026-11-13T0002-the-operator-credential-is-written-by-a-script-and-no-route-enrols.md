# ADR-2026-11-13T0002: The operator's credential is written by a script, and no route enrols anyone

- **Status:** proposed. Decided by the agent on 2026-11-12, delegated by the operator, to ratify at pull-request review.
- **Date:** 2026-11-13
- **Deciders:** the agent, delegated by Hugo Borsoni
- **Tags:** opening-trainer, borsouvertures, auth, data

## Context

The API serves one account, the operator's (ADR-2026-11-12T2359). The site is public at `borsouvertures.borso.fr`, and each preview is public too. The spec copies pragma's per-credential slice and adds `POST /api/auth/enrol`, which closes once a row exists. It then says the first caller owns the account, so the operator enrols on the day of the merge.

That sentence is the point this record challenges. In pragma the enrolment route was never open to a stranger. It asked for the old shared password (read in [ADR-2026-09-14T1903](./2026-09-14T1903-per-member-credentials-replace-the-shared-password.md)). borsouvertures has no earlier secret, so the copied route would be gated by nothing. Anyone who posts first owns the account, on prod between the deploy and the operator's visit, again each time the row is deleted for a recovery, and on every preview for its whole life.

Three constraints shape the answer. The operator holds no secret at deploy time and a merge must not wait on one. An agent must sign in on a preview and test sync end to end with no secret, because the operator required a fully autonomous test strategy. An agent cannot read a credential, key or token table in production (read in the summary of `docs/knowledge/the-production-database-is-out-of-reach-of-a-hosted-session.md`), so a value stored there reaches the operator only through his own admin access.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | medium | The operator signs in once per device. A reader sees a sign-in link and nothing else. | The visual-validation rows on sign-in and on the signed-out screens |
| An agent tests sign-in and sync on a preview with no secret | operator | high | He required that every check is automated. | The row "a review made in one browser profile shows in a second after sign-in", run by the validator on the preview |
| A stranger cannot take the account | author | high | The site is public and the API has a write route. | The count of unauthenticated requests that can create a credential on prod |
| No secret held by the operator at deploy time | author | high | A deploy that needs a secret blocks on a person. | New secrets or variables in `deploy.yml` and `preview.yml` |
| What the operator must do, and how often | author | medium | One person operates every app. | Steps in the operator-backlog row |
| Code and routes added | author | low | Each public route is a surface to test. | Routes and screens in the diff |

## Decision

**The API has a sign-in route and no enrolment route. On prod the one credential row is written by a script the operator runs once. On a preview the fixture seed writes it.**

1. **The slice is copied from pragma, not imported.** One `operator_credential` row holds an argon2id hash made with `hash-wasm`. The session is a signed cookie, `HttpOnly`, `Secure` and `SameSite=Strict`, that carries the credential's session epoch. Failed sign-ins are counted in `sign_in_attempt`, in the database, so every Lambda instance counts the same attempts. All of it is read in `apps/pragma/api/src/auth/`. There is no passkey.
2. **Prod.** `scripts/seed-operator-credential.sh` follows `scripts/seed-admin-pin.sh` (read). It asks for the password without echo, hashes it with the API's own function so the format cannot drift, and upserts `operator_credential` and the `app_config` signing key under the `borso-admin` profile. Until it has run, sign-in answers `auth-not-bootstrapped` and the app works for everyone as a local trainer. Running it again changes the password, and that is also the recovery.
3. **Preview.** The API mounts `POST /api/__test/seed` only when the test-seed flag is on, as pragma does (read in `apps/pragma/api/src/app.ts`), and `preview.yml` already calls that route after each deploy for an app that has an `api/src/__test` folder (read). The seed writes a fixture credential whose password is a constant in the repository, and fixture review events. An agent signs in with that constant.
4. **A preview clones nothing from prod.** Its password is public to anyone who reads the repository, so a clone would publish the operator's review history and would carry his hash. The stack sets no `cloneFromSchema`. This settles the question the spec left to the plan.

It would be worth reversing if a second account is asked for, because a second person cannot be given a script. It would also be worth reversing if the operator wants to set or change the password from his phone. Option C is then the next step, not the first-caller rule.

## Consequences

- `+` No unauthenticated request can create or replace a credential on prod. The first-caller race does not exist.
- `+` An agent signs in on every preview from the first deploy, with a value it reads in the repository.
- `+` The enrolment route, its screen and its closed state are not built.
- `+` The merge does not wait on the operator. Sync starts when he has run the script.
- `-` The operator needs a laptop with the `borso-admin` profile, `psql` and `node` to sign in for the first time, to change the password and to recover it. None of it can be done from the phone.
- `-` A preview never shows the operator's own progress. He validates on fixture events.
- `-` Anyone who knows the fixture password can sign in on a preview. It guards fixture data only, and that is acceptable only while a preview clones nothing.
- `-` If the test-seed flag were ever set on prod, the fixture password would open the account. The flag is set by the stack for non-prod stages only, and the plan asserts it on the prod template snapshot.
- `~` The spec's back e2e case "a second enrolment answers `enrolment-closed`" is replaced by two cases. `POST /api/auth/enrol` answers 404, and a sign-in before the row exists answers `auth-not-bootstrapped`.
- `~` `app_config` and `operator_credential` keep the shape the spec gives them.

## Alternatives considered

### Option A — A script writes the row on prod, the fixture seed writes it on a preview, no enrolment route (chosen)

- **Raised by:** author
- **Summary:** as in the Decision.
- **Strengths:**
  - zero unauthenticated writes to the credential.
  - a preview is signed into with no secret.
  - the repository already runs this shape for last-loop-lepin's admin PIN (read in `scripts/seed-admin-pin.sh`).
- **Costs:** one script run by the operator, at a laptop, per password change.
- **Rationale:** it is the only option that meets the three high criteria together.

### Option B — The first caller owns the account, a self-closing enrolment (rejected)

- **Raised by:** author (the spec's rule)
- **Summary:** `POST /api/auth/enrol` accepts any password while no row exists. pragma's first bootstrap worked this way (read in `docs/knowledge/fresh-prod-bootstrap-503.md`).
- **Strengths:** no script and no laptop. The operator enrols from his phone.
- **Costs:** a stranger who posts first owns the sync account until the operator deletes the row with admin access. The window reopens at every recovery. The likelihood is unknown and the damage is small, a polluted or readable review log, but the repair needs the same admin access Option A asks for once.
- **Rejection rationale:** it fails "a stranger cannot take the account". It would win if the site were not public.

### Option C — Enrolment asks for a code that was born in the database (rejected)

- **Raised by:** author (from the coordinator's brief)
- **Summary:** A migration writes a random `enrolment_code` into `app_config`. The enrolment route stays, and asks for it.
- **Strengths:** no stranger can enrol. The password is typed in the app, not in a terminal.
- **Costs:** the operator still needs admin database access to read the code, because the agent reader cannot see that table. The route, the screen and the code's lifecycle are extra code. A preview needs the fixture seed anyway, since an agent cannot read a preview's database.
- **Rejection rationale:** it asks the same right of the operator as Option A and builds more. It becomes the choice the day a password must be set from a phone.

### Option D — An operator dispatch opens an enrolment window (rejected)

- **Raised by:** author (from the coordinator's brief)
- **Summary:** A `workflow_dispatch` marks enrolment open for a short time, and the operator enrols in the app.
- **Strengths:** a dispatch works from a phone.
- **Costs:** a new workflow that writes to the prod schema, and the role to do it. The route is open to anyone during the window.
- **Rejection rationale:** it loses on code added and still leaves a window, however short.

### Option E — A preview clones prod's credential, as pragma's does (rejected)

- **Raised by:** author
- **Summary:** The preview half only. The operator signs in on a preview with his production password ([ADR-2026-08-09T1654](./2026-08-09T1654-pragma-previews-clone-production.md), read in the index and in the knowledge entry below).
- **Strengths:** the operator sees his own progress on a preview.
- **Costs:** an agent cannot sign in (read in `docs/knowledge/a-pragma-preview-cannot-be-signed-into.md`). The production hash sits in a public preview's schema.
- **Rejection rationale:** it fails the agent-testing criterion, which the operator raised.

### Option F — No sign-in, the API trusts a device (rejected)

- **Raised by:** author
- **Summary:** Not doing it. Devices share a sync key kept in the browser and the API checks nothing else.
- **Strengths:** no credential, no script, no cookie.
- **Costs:** the key is a password with no rate limit and no way to revoke a lost device.
- **Rejection rationale:** it fails the stranger criterion in a slower way.

## Scores

|  | A, script and fixture | B, first caller | C, code in the database | D, dispatch window | E, clone prod's credential | F, no sign-in |
|---|---|---|---|---|---|---|
| Changes the app for its users | ✓ a sign-in link | ✓ plus an enrolment screen | ✓ plus an enrolment screen | ✓ plus an enrolment screen | ✓ | ✓ |
| Agent tests a preview with no secret | ✓ fixture password | ✓ only if the agent enrols first | ✓ with the fixture seed | ✓ with the fixture seed | ✗ needs the prod password | ✓ |
| A stranger cannot take the account | ✓ no route creates one | ✗ whoever posts first | ✓ | ✗ during the window | ✓ on prod | ✗ a key with no limit |
| No operator secret at deploy | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| What the operator must do | ✗ a script at a laptop | ✓ a form on the phone | ✗ read a code, then a form | ✓ a dispatch, then a form | ✓ nothing more | ✓ nothing |
| Code and routes added | ✓ one script, no route | ✗ a route and a screen | ✗ a route, a screen, a code | ✗ a workflow, a route, a screen | ✓ | ✓ |

## Implementation pointers

- Spec: [`docs/features/borsouvertures/opening-trainer/spec/spec.md`](../features/borsouvertures/opening-trainer/spec/spec.md), decision row "Is pragma's shared-password ADR the sign-in precedent?" and "Rows to add to `docs/operator-backlog.md`"
- Plan: not written yet
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/borsouvertures/api/src/auth/` (new, copied from `apps/pragma/api/src/auth/`), `apps/borsouvertures/api/src/__test/` (new), `scripts/seed-operator-credential.sh` (new), `apps/borsouvertures/cdk/lib/stack.ts`
- Operator-backlog row: run `scripts/seed-operator-credential.sh` once after the merge that ships sync. It needs the `borso-admin` profile. It is done when a sign-in with a wrong password on `borsouvertures.borso.fr` answers 401 and no longer `auth-not-bootstrapped`.
- Related ADRs: [ADR-2026-11-12T2359](./2026-11-12T2359-borsouvertures-becomes-a-full-stack-app-for-one-account.md), [ADR-2026-09-14T1903](./2026-09-14T1903-per-member-credentials-replace-the-shared-password.md) (the slice copied, without its enrolment window and without passkeys)
