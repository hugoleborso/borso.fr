# Plan — A member who forgot their password gets back in with the band password

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

Intent: add one public endpoint and one public screen that replace a forgotten password using the band password as proof, and delete the enrolment endpoint and screen in the same change.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q.O.D. 1 | Typed username, no public listing | `recoverPasswordSchema` in `credentials.schema.ts` reuses the existing `usernameSchema`, which already trims and lowercases | A username typed `  Borso ` reaches `findCredentialByUsername` as `borso`; asserted in the back-e2e suite |
| Q.O.D. 2 | Sign the member in on success | `recoverPassword` returns `IssuedSession` from the existing `issueSession`; the controller calls the file's `writeSessionCookie`, unchanged | Response carries `Set-Cookie: pragma_session=…; HttpOnly; SameSite=Strict`, asserted as the enrolment test asserts it today |
| Q.O.D. 3 | Passkeys survive | Nothing touches `member_passkey`. `updateCredentialSecret` is the only write | A passkey row inserted before the recovery is still there after it; back-e2e case. The second half — that the device still authenticates — holds by construction, since `finishPasskeyAuthentication` reads the epoch from the credential row at sign-in time, and is not separately asserted |
| Q.O.D. 4 | Dedicated stricter budget | `SHARED_PASSWORD_BUDGET = { maxAttempts: 3, windowMs: 60 min }` beside `MEMBER_LOGIN_BUDGET` in `rate-limit.utils.ts` | `rate-limit.utils.test.ts` asserts the boundary; the file is 100%-coverage gated |
| Q.O.D. 5 | Only one door onto the band password remains | `POST /enrol` and `GET /enrolment` are removed from `publicRouter` | Both answer 404 through the real router; back-e2e case |
| Q.O.D. 6 | Enrolment deleted, page and endpoint | `enrolment.core.ts`, its test, `EnrolPage.tsx`, `EnrolForm.tsx`, `useEnrol`, `useEnrolmentOffers`, `selectEnrolErrorMessageKey` and the `enrol*` i18n keys all go | `pnpm exec knip` reports no unused export; that is the gate that catches a half-deletion |
| Result | New public endpoint | `publicRouter.post('/recover-password', zValidator('json', recoverPasswordSchema), …)` in `auth.controller.ts`, following `controller-split-routers` — it belongs on the ungated router, never on `rotateRouter` | Reaching it with no cookie succeeds; that is the point |
| Result | New public screen | `RecoverPage.tsx` follows `route-detail-page`, `RecoverPasswordForm.tsx` follows `route-form` with `@tanstack/react-form` and `PasswordField`, both carrying `/** @Feature auth */` | The file layer is inferred from the path plus suffix; `pnpm exec tsx scripts/architecture/architecture-graph.ts --check` stays green |
| Use cases, shared secret first | Band password verified before the username lookup | `recoverPassword` calls `argon2Verify` against `config.passwordHash` before `findCredentialByUsername`, and both failures return the single `invalid-recovery` kind | Read the function top to bottom: no early `return` between the two that distinguishes them |
| Use cases, epoch | Other sessions die | `nextSessionEpoch(credential.sessionEpoch)` reused from `member-session.core.ts`, passed to `updateCredentialSecret` | A cookie minted before the recovery is refused after it; back-e2e case |
| Error cases | One message for two failures | `selectRecoverErrorMessageKey` in `login.core.ts` keys on the status alone, as `selectLoginErrorMessageKey` does beside it: 401 → `auth.invalidRecovery`, 429 → `auth.recoveryRateLimited`, 503 → `auth.notBootstrapped`, falling back to `auth.unknownError`. Reading the error code out of the body would decide nothing, since every code the endpoint returns maps onto one status | `login.core.test.ts` covers each branch; the file is 100%-coverage gated and the mutation gate breaks under 100, which is what caught the body-reading branch as dead |
| Changes | The helper's callers stay untouched | `buildAuthenticatedApp` in `test/auth-utils.ts` swaps its `enrol()` call for `createCredentialForMember` plus `loginAsMember`, keeping its `AuthenticatedApp` return | Sixteen of its seventeen other callers are untouched. `setlists/voting.controller.test.ts` changes because it called the deleted `enrol()` helper directly rather than going through `buildAuthenticatedApp`, which the first draft of this row missed |

**Pattern coherence pass.** The change introduces no new dependency and no new state pattern. `useRecoverPassword` copies `useLogin` exactly — a pessimistic `useMutation` with `rememberSessionMarker()` and a `setQueryData` on `authKeys.session()` in `onSuccess`, which is the `query-pessimistic-mutation` blueprint. It must **not** carry `onMutate`, so `borso/no-refetch-of-optimistically-written-query` has nothing to say. Deleting `useEnrolmentOffers` removes the only `useQuery` on the auth feature; nothing else reads `authKeys.enrolment()`, so that key leaves with it.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| A member exists with no credential when enrolment is deleted, and is locked out permanently with no self-service path | **High** | Not mitigable in code. The PR carries a before-merge gate: an operator runs `SELECT count(*) FROM member WHERE id NOT IN (SELECT member_id FROM member_credential)` against the prod schema and merges only on `0` | Nothing in CI can see the production table. This is the one check a human owns, and the PR body says so |
| The argon2 verify order is reversed during implementation, so a wrong username short-circuits before the band password is checked | Medium | The service is written with the verify first and one shared refusal kind, so there is no branch to reverse | A back-e2e case asserts that an unknown username and a wrong band password return byte-identical bodies and the same status |
| `session_epoch` is forgotten, leaving old sessions alive | Medium | `nextSessionEpoch` is called in the same statement that builds the new hash, mirroring `changePassword` | Back-e2e case: a pre-recovery cookie must be refused. Without it the feature looks green while leaking |
| Half-deleted enrolment leaves an orphan export, a dead i18n key or a dangling route | Medium | Deletion is enumerated file by file in the spec's *Files to change* | `pnpm exec knip` for exports; `pnpm --filter @borso-app/pragma typecheck` for the route and the query; a grep for `auth.enrol` for the i18n keys |
| The rate-limit bucket is per Lambda container, so the real budget is 3 per container per hour, not 3 globally | Medium | Not fixed here — it is the existing login limiter's behaviour, and changing it means a shared store, which is a separate decision | Recorded in the spec's *Zero-defect strategy* so a future reader does not over-trust the number. A burst of 401s in CloudWatch is the signal |
| `createCredentialForMember` gains a second caller in test code and a reader mistakes it for a production path | Low | The plan leaves it where it is; the spec's *Out of scope* states plainly that it is reachable only from the test-seed route | A grep for its callers returns `__test/test-seed.service.ts` and `test/auth-utils.ts` and nothing else |
| The new screen breaks below 375 px or the link is unreachable on a phone | Low | `RecoverPage` copies `EnrolPage`'s container classes verbatim, which already pass the gate | `/visual-validation` drives 375 px and 1280 px |

## Code-quality self-check

- [ ] Repo lint rules pass (`pnpm exec eslint --no-warn-ignored --max-warnings 0`).
- [ ] Type-assertion plugin satisfied (only `as const`, `as unknown` allowed in this repo).
- [ ] No `any`.
- [ ] No abbreviations or single-letter locals outside trivial loop indices.
- [ ] Magic numbers / strings extracted to named constants — the recovery budget's `3` and `60` become named constants beside the existing `RATE_LIMIT_MAX_ATTEMPTS`.
- [ ] Comments document the WHY only — in practice, none: `borso/no-comments` bans them outright, and only `@Blueprint`, `@FollowsBlueprint` and `@Feature` annotations are written.
- [ ] No JSDoc on internals.
- [ ] Function names describe the result, not the mechanism — `recoverPassword`, `selectRecoverErrorMessageKey`.

## Pre-flight gates

Run, in order, before push:
1. `pnpm install`.
2. `pnpm --filter @borso-app/pragma typecheck`.
3. `pnpm exec eslint --no-warn-ignored --max-warnings 0`.
4. `pnpm --filter @borso-app/pragma build`.
5. `/visual-validation` against the spec — this is UI work.
6. `pnpm exec knip` — no unused entries. Load-bearing here, since this change deletes exports on both sides.
7. `/technical-validation` for the code-review pass.
8. `pnpm --filter @borso-app/pragma run test` — the back-e2e suite needs the local Postgres, which `scripts/local-postgres.sh` boots from the workspace's own test script.

## Open questions / unknowns

- **Whether every member currently holds a credential is unverified.** The session that wrote this plan has read-only AWS credentials and its harness refuses the DSQL admin token, so the count was never run. It is a before-merge gate on the PR, not an assumption this plan is allowed to make.
- The spec does not say whether a recovery should be visible to the other members. Nothing is surfaced today and nothing is added; if the band later wants an audit trail, that is a new feature with a new table, not a column bolted onto `member_credential`.

## Missing technical skills

- No `/controller` skill for the Hono routing layer, so the controller slice of this plan was written by hand against `controller-split-routers`.
- No `/database` skill, though this change needs no migration, so nothing was lost this time.
- No `/auth` skill. Three features in a row have now reasoned about argon2 parameters, the session cookie and the epoch by re-reading `credentials.service.ts`. That is the shape of a skill worth seeding.
