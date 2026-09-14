# Plan — Each member signs in as themselves and the band picks its next setlist by vote

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all, or named it correctly and the defect comes from elsewhere.

Ships in two commit series on one branch: **A. member accounts** (deployable on its own), then **B. setlist voting** (needs A). Decisions come from [ADR-0015](../../../../adr/0015-per-member-credentials-replace-the-shared-password.md) and [ADR-0016](../../../../adr/0016-simplewebauthn-carries-the-passkey-flow.md).

## How each spec decision becomes code

### Series A — member accounts

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Replace the shared password | Credentials per member, one gate | `api/src/auth/credentials.schema.ts` (NEW, `schema-table-and-input` + `schema-dsql-constraints`), `credentials.repository.ts` (NEW, `repository-query`), `member-session.middleware.ts` (NEW, `middleware-session-gate`), `app.ts` mounts it on every slice | grep shows zero remaining references to `requireSharedPasswordSession`; a request with no cookie gets 401 on every router |
| Cookie carries the member | Payload becomes `{ memberId, epoch, issuedAt, expiresAt }` | `auth/member-session.core.ts` (NEW, pure, `core-decision`), `session-cookie.utils.ts` (UPDATE) signs and verifies through it | a cookie in the old shape fails with `session-invalid`, pinned by a test carrying a literal old payload |
| Password change signs out the other browsers | `session_epoch` on the credential, bumped on change, compared on verify | `me.service.ts` (NEW, `service-orchestration`), compared in `member-session.core.ts` | back-e2e: member A changes password, A's second cookie dies, B's cookie lives |
| Enrolment window closes itself | `enrolCandidates` returns members without a credential; empty list means the route refuses | `auth/enrolment.service.ts` (NEW), `enrolment.core.ts` (NEW, pure) decides `open` / `closed` from the two lists | back-e2e: enrol five of five, the sixth call answers `enrolment-closed` |
| Shared password opens enrolment only | The enrolment router is the only one still reading `app_config.password_hash` | `auth.controller.ts` (UPDATE, `controller-split-routers` — the slice already splits public / bootstrap / rotate, enrolment is a fourth) | the split-router shape makes an ungated route impossible to add by accident |
| Every member is admin | No role column, no check anywhere | — | grep finds no `isAdmin`, no `role` |
| Passkeys, alternative single factor | `@simplewebauthn/server` behind one adapter, `@simplewebauthn/browser` on the site | `auth/passkey.adapter.ts` (NEW, `adapter-external-service`, `@DependsOnExternal webauthn`), `passkey.service.ts` (NEW), `webauthn_challenge` table | the SDK is imported in the adapter and nowhere else, which `borso/` import rules and knip both see |
| Relying-party id per stage | Read once through `auth.environment.ts` | `api/src/auth/auth.environment.ts` (NEW, `environment` layer) | a missing variable raises the slice's own error at call time, not at import |
| Sign-in and account screens | Member field + password + passkey button; account page for password and passkeys | `site/src/routes/LoginPage.tsx` (UPDATE), `routes/EnrolPage.tsx` (NEW), `routes/account/AccountPage.tsx` (NEW), `lib/queries/auth.queries.ts` (NEW, `query-module`) | forms go through `@tanstack/react-form` with the API's own Zod schema, per `core-form-schema` |

### Series B — setlist voting

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| A status on the existing setlist | `status` and `target_song_count`, both nullable (DSQL), null status reads as `locked` | `setlists.schema.ts` (UPDATE), `resolveSetlistStatus` in `setlists.core.ts` (UPDATE) | a row written before the migration reads as `locked`, pinned by a test on the resolver |
| Budget = 3 × target, max 3 per song | `computeBudget`, `canAfford`, `applyScore` | `setlists/voting.core.ts` (NEW, pure, `core-decision`, 100 % covered) | property-style tests over the boundary: exactly at budget, one over, rescoring the same song down then up |
| Unspent budget still counts | The tally sums what exists; nothing normalises | `voting.core.ts` `tally` | a member with one point appears in the totals |
| Everything visible live | The tally carries `pointsByMember` | `voting.repository.ts` (NEW) groups by song and member, `VoteTally.tsx` (NEW, `organism-query-owning`) | the response shape carries member ids; no server-side hiding to test |
| Propose top N plus ties | `proposeClosing` returns songs sorted by points, cut at N, then extended while the next song ties the Nth | `voting.core.ts` | a tie of three at the boundary of a 15-song target proposes 17 |
| Closing writes entries and locks | One transaction: delete existing entries, insert the proposal in the order given, set status | `voting.service.ts` (NEW, `service-orchestration`), `voting.repository.ts` lends the transaction (`repository-owned-transaction`) | closing twice concurrently leaves one consistent set of entries, not two interleaved |
| Reopening keeps the votes | Status goes back to `voting`; nothing deletes `setlist_vote` | `voting.service.ts` | back-e2e: close, reopen, the totals are unchanged |
| Catalogue moves during the vote | The deck reads the live catalogue; no ballot table | `SetlistVotePage.tsx` (NEW) composes the songs query and the votes query | a song created mid-vote appears in the deck without a reload of the votes query |
| Deleting a member or a song deletes the votes | Added to the existing cascades | `members.service.ts`, `songs.service.ts` (UPDATE, both already own a cascade) | the existing cascade tests grow one assertion each |
| Swipe zones 1 / 2 / 3 | Pointer offset → zone → points, plus the gradient strength a zone shows mid-drag | `site/src/routes/setlists/vote-deck.core.ts` (NEW, pure, 100 % covered), `components/organisms/VoteDeck.tsx` (NEW), `molecules/VoteBudgetBar.tsx`, `atoms/PointsBadge.tsx` | every zone boundary, the dead zone at the centre, and the exhausted state are unit tests; the drag itself is an argent run |
| Scoring is optimistic | `useMutation` with `onMutate`, reconciled from the response, **no** invalidation | `lib/queries/voting.queries.ts` (NEW, `query-optimistic-mutation`) | `borso/no-refetch-of-optimistically-written-query` passes; see the DSQL read-after-write dantotsu |
| Budget exhausted message | i18n key, both catalogues | `i18n/{en,fr}.json` | `i18n-parity.core.test.ts` already fails on a key present in one file only |

### Pattern coherence pass

- **Drag.** `@dnd-kit` is already a dependency for the setlist reorder, but the deck does **not** use it: `docs/knowledge/dnd-kit-pointersensor-loses-touch-to-page-scroll.md` records the sensor losing touch to page scroll, and a card deck needs a free-form gesture with a release position rather than a sortable list. The deck uses native Pointer Events with `touch-action: none` on the card. That is a second drag idiom in the app, deliberately, and it is written here so the reviewer does not read it as an oversight.
- **Auth.** No second session notion survives this change, which is the whole point of ADR-0015.
- **Forms.** Login, enrolment, password change and the target-count field all go through `@tanstack/react-form`; no new form idiom.
- **Argon2.** The hashing already in `auth.service.ts` is reused as is; no new crypto dependency beyond `@simplewebauthn`.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| A DSQL-only DDL rejection at preview deploy | high | Only `ADD COLUMN name type` on existing tables, every constraint on freshly created tables, no `jsonb`, no `ALTER COLUMN`; every statement re-runnable, per migration `0003`'s header | the preview stack fails at the migration custom resource; local Postgres will **not** catch it, so the migration is read against the DSQL grammar by eye before push |
| Every live cookie dies at deploy | medium | Intended and named in ADR-0015 and in the commit body | the band sees one sign-in prompt; `session-invalid` spikes once and settles |
| Passkey verifies on preview, fails in production | medium | Relying-party id and origin read per stage through `auth.environment.ts`, never hard-coded | a production `passkey-verification-failed` with a preview host in the log field |
| The swipe passes with clicks and fails with thumbs | high | `scripts/argent.sh gesture-drag` is in the validation loop, one run per zone at 375 px; a synthetic click is explicitly not accepted as evidence. `gesture-swipe` is a no-op on Chromium that reports success, so it is not used | the repo has hit this twice across six audit rounds; the visual-validation report must carry argent output. A touch-specific failure stays unreachable from this sandbox and ships as a named gap |
| Optimistic scoring reverted by a stale DSQL read | medium | No invalidation after a score; reconcile from the mutation response | `borso/no-refetch-of-optimistically-written-query` fails the lint; visually, a point that lands then jumps back |
| Two members close the same vote at once | low | The closing transaction is the only writer of the entries, and it deletes before inserting inside the transaction | duplicated or interleaved entries after a close; back-e2e runs two closes in parallel |
| The enrolment window never closes because a member row has no claimant | low | The candidate list is computed from the `member` table, so it closes exactly when every existing member is enrolled | `enrolment-closed` never fires; the account page shows a member without a credential |
| `@simplewebauthn` version bump silently changes verification behaviour | low | Pinned through the workspace catalog like every other shared dependency | `check-dependency-catalog` in pre-commit refuses an uncatalogued version |
| Vocabulary drift: "account" is currently a forbidden word | medium | `apps/pragma/VOCABULARY.md` is updated in series A, in the same commit as the schema | `check-vocabulary-paths` fails when a term names no folder |

`infra/cdk/**` and `infra/shared/**` are untouched, so their 100 % coverage gates are unaffected.

## Code-quality self-check

- [ ] `pnpm --filter @borso-app/pragma run lint` passes (ESLint is the linter here; the skill template's Biome line is stale).
- [ ] Type assertions: none. JSON columns go through `const parsed: unknown = JSON.parse(raw)` then a Zod parse, per `repository-json-column`.
- [ ] No `any`.
- [ ] No abbreviations or single-letter locals.
- [ ] Magic numbers named: `POINTS_PER_TARGET_SONG = 3`, `MAX_POINTS_PER_SONG = 3`, `CHALLENGE_TTL_MS`, `SESSION_TTL_DAYS`, the three zone boundaries.
- [ ] No comments in code; only `@Blueprint`, `@FollowsBlueprint`, `@Feature`, `@DependsOnExternal` and lint-exception reasons.
- [ ] Function names describe the result: `proposeClosing`, `resolveSetlistStatus`, `selectZoneForOffset`, not `handleX`.
- [ ] Every new file carries `// @FollowsBlueprint <id>` naming a blueprint that exists.

## Pre-flight gates

Run, in order, before each push:

1. `pnpm install`.
2. `pnpm --filter @borso-app/pragma run typecheck`.
3. `pnpm --filter @borso-app/pragma run lint`.
4. `pnpm --filter @borso-app/pragma run test:core` (coverage gate on `*.core.ts` / `*.utils.ts`).
5. `pnpm --filter @borso-app/pragma run test` (back-e2e against the local Postgres).
6. `pnpm --filter @borso-app/pragma run build`.
7. `pnpm exec knip`.
8. `scripts/reports.sh all` so the generated maps and the blueprint index match the tree.
9. `/visual-validation` against the spec, including the `scripts/argent.sh gesture-drag` pass on the deck.
10. `/technical-validation` on the diff.
11. `/standards-review` and its seals.

## Open questions / unknowns

- **Username.** The spec says a member picks their name at enrolment. The plan takes `username` as a lowercase, unique, trimmed string seeded from `member.firstName`, editable never. Two members with the same first name would collide; the band has five distinct first names today, and the enrolment screen refuses a duplicate with `username-taken`.
- **Challenge sweep.** Expired `webauthn_challenge` rows are deleted on each options call rather than by a scheduled job. At five members this is correct and free; at a larger scale it would need a real sweep.
- **Target song count after opening.** The spec does not say whether the target can change mid-vote. The plan allows it, and recomputes the budget from it; a member already over the new budget keeps their points and is refused any further scoring until they come down. This is the kind of thing a reviewer should challenge.

## Missing technical skills

- `/database` — every DSQL migration in this repo re-derives the same constraints from two dantotsus. A skill holding the accepted DDL grammar and the re-runnable statement shape would have written the migration section of this plan.
- `/auth` — session cookies, hashing, and now WebAuthn. Third time this repo writes one from scratch.
