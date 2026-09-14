# Standards review — claude/setlist-voting-feature-84f01u against origin/main

Verdict: FINDINGS
Ledger: c43dff041051
Reviewed: 65 file(s). Sealed: 52. Findings: 13.

## Findings

### apps/pragma/cdk/lib/stack.ts:39

Bullet: step 4 of the standards-review contract — "A file carrying a blueprint marker is claiming to copy that blueprint; check that it does." The `@Blueprint` block is bound to its subject by position.

```ts
 * @BlueprintDescription A plain function taking its scope in the props rather than a subclass of `Stack`, …
 */
interface SiteOrigin {
  readonly origin: string;
  readonly hostname: string;
}
```

The branch inserted `interface SiteOrigin` and `readSiteOrigin` between the `@Blueprint app-cdk-stack` JSDoc and `buildPragmaAppStack`, which the block describes. The canonical example of "Application CDK Stack" is now a two-field interface. `blueprint-indexing.ts --check` passes, because the file is still well formed and still has one declaration beneath the marker — this is the failure shape recorded in `docs/dantotsus/the-marker-that-moved-to-the-function-below-it.md`. Move the two new declarations above the JSDoc block.

Introduced: by this branch
Fix size: one line (move the block, or move the two declarations)

### apps/pragma/site/src/lib/passkey.adapter.ts:21

Bullet: step 4 of the standards-review contract — a follower marker claims to copy the blueprint it names.

```ts
// @FollowsBlueprint adapter-direct-upload
export async function startPasskeyEnrolment(options: unknown): Promise<unknown> {
```

`adapter-direct-upload` is "Use when the browser sends bytes to a storage service rather than to the application's own API… takes the presigned URL the API returned and the file, and answers whether the transfer was accepted". This module wraps `@simplewebauthn/browser`; there is no presigned URL, no file, and no transfer verdict. It is an adapter over a browser API, which is a different pattern. Either name a blueprint it does match or declare one.

Introduced: by this branch
Fix size: one line

### apps/pragma/api/src/me/me.controller.ts:24

Bullet: step 4 of the standards-review contract — marker position binds the claim.

```ts
// @FollowsBlueprint controller-guarded-router
function readNow(): Date {
  return new Date();
}
```

The claim lands on `readNow`, a one-line clock helper, not on `buildMeRouter` below it, which is the router that applies `requireMemberSession` to every route.

Introduced: by this branch
Fix size: one line

### apps/pragma/api/src/auth/credentials.repository.ts:16

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors."

```ts
export interface PasskeyRow {
  id: string;
  memberId: string;
  credentialId: string;
  publicKey: Buffer;
  signCounter: number;
  transports: string;
  label: string;
  createdAt: Date;
}
```

`PasskeyRow` reproduces every column of `memberPasskeyTable` by hand, directly beside it. `typeof memberPasskeyTable.$inferSelect` is what the sibling `setlists.repository.ts:16` already writes (`export type SetlistRow = typeof setlistTable.$inferSelect`). `CredentialRow` above it is a four-of-five-column projection, so it is a weaker case, but `Pick<typeof memberCredentialTable.$inferSelect, …>` would still derive it.

Introduced: by this branch
Fix size: one file, no callers (the inferred shape is identical)

### apps/pragma/site/src/lib/queries/voting.utils.ts:17

Bullet: "…and a response from the Hono client, rather than being written out by hand beside the thing it mirrors."

```ts
export interface VoteBoard {
  readonly status: 'voting' | 'locked';
  readonly targetSongCount: number;
  readonly budget: VoteBudget;
  readonly tallies: readonly SongTally[];
  readonly lastScoredAt: string | null;
}
```

`VoteBoard`, `SongTally` and `VoteBudget` hand-copy the body `readVoteBoard` returns from `apps/pragma/api/src/setlists/voting.service.ts:44`. Every other query module in this application derives it — `songs.queries.ts:17` is `type SongsListResponse = InferResponseType<typeof api.api.songs.$get>`, and `members.queries.ts`, `mastery.queries.ts` and `transitions.queries.ts` do the same. Nothing here fails if the API's response shape moves.

Introduced: by this branch
Fix size: one file, no callers

### apps/pragma/site/src/lib/queries/voting.queries.ts:27

Bullet: same bullet, at the call site.

```ts
    queryFn: async (): Promise<VoteBoard> => {
```

The annotation pins the query's result to the hand-written type rather than to `InferResponseType<(typeof api.api.setlists)[':id']['votes']['$get']>`, which is where the drift becomes invisible. Everything else in this file is correct: `useScoreSong` carries `onMutate`, reconciles from the mutation response in `onSuccess` and never invalidates, which is what the data-fetching bullet asks for.

Introduced: by this branch
Fix size: one line, once the type above is derived

### apps/pragma/site/src/lib/queries/me.queries.ts:13

Bullet: same bullet.

```ts
export interface SignedInMember {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly username: string;
}
```

`SignedInMember` and `PasskeySummary` (line 20) hand-copy the bodies of `GET /api/me` and `GET /api/me/passkeys`.

Introduced: by this branch
Fix size: one file, no callers

### apps/pragma/site/src/lib/queries/auth.queries.ts:37

Bullet: same bullet.

```ts
export interface EnrolmentOffer {
  readonly memberId: string;
  readonly firstName: string;
  readonly suggestedUsername: string;
}
```

Hand-copies the `offers` element of `GET /api/auth/enrolment`, which the API declares as `EnrolmentOffer` in `credentials.service.ts:114`. Two declarations of the same shape on either side of the wire is the thing the bullet names.

Introduced: by this branch
Fix size: one file, no callers

### apps/pragma/site/src/routes/LoginPage.tsx:57

Bullet: "`reviewer` checks that a route composes organisms and owns no layout primitive, because the atomic rules read the bucket out of the path and a route is in no bucket." Standard 05, *The route*: "It holds no layout primitives and no business logic."

```tsx
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
```

The whole sign-in form — the card, the two labelled fields, the show-password toggle, the submit subscription, the passkey button and the error paragraph — is markup in the route. The file carries `// @FollowsBlueprint route-form` (line 28), and `route-form` is an **organism**-layer blueprint whose canonical example is `apps/pragma/site/src/components/organisms/BarForm.tsx:63`. What satisfies both the bullet and the marker is a `LoginForm` organism holding the `useForm` call and the markup, with the route holding the redirect and `useLocation`.

Introduced: by this branch
Fix size: one file plus one new organism, no other callers

### apps/pragma/site/src/routes/EnrolPage.tsx:47

Bullet: same bullet.

```tsx
    <main className="min-h-dvh flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
```

Same shape as `LoginPage`: four fields, a raw `<select>` with the suggested-username side effect in its `onChange`, and the layout, all inside the route under a `route-form` marker.

Introduced: by this branch
Fix size: one file plus one new organism, no other callers

### apps/pragma/site/src/routes/account/AccountPage.tsx:53

Bullet: same bullet.

```tsx
    <section className="flex flex-col gap-4 p-4 sm:p-6 max-w-[640px]">
```

Three `Card` regions — identity, password change, passkey list and enrolment — composed inline, with the passkey label kept in a bare `useState` beside a `useForm`. Two organisms (`PasswordChangeForm`, `PasskeyManager`) would leave the route with nothing but the composition.

Introduced: by this branch
Fix size: one file plus two new organisms, no other callers

### apps/pragma/site/src/routes/setlists/SetlistVotePage.tsx:83

Bullet: same bullet, plus the business-logic half of the same sentence.

```tsx
      <header className="px-4 pt-4 flex items-baseline justify-between gap-3">
```

The route owns a header region with the title and the open/close-vote buttons, a `<div className="px-4">` wrapper around the deck, and three derivations built during render: `songsById`, `membersById` and `pointsBySongId` (lines 65-79). The derivations belong in a `vote-page.core.ts` beside the other four core modules this feature already has, and the header belongs in the existing `PageHeader` molecule or a `VoteHeader` organism.

Introduced: by this branch
Fix size: one file plus one core module, no other callers

### apps/pragma/api/src/songs/songs.repository.ts:239

Bullet: "`reviewer` checks that a workflow writing more than one table wraps the writes in one transaction owned by the service, and that a cascade DSQL will not enforce is written out explicitly." Standard 11, *Transactions*: "A workflow that writes more than one table wraps the writes in one transaction."

```ts
  await database.delete(masteryOverrideTable).where(eq(masteryOverrideTable.songId, id));
  await database.delete(setlistEntryTable).where(eq(setlistEntryTable.songId, id));
  await deleteVotesOfDeletedSong(database, id);
  const deleted = await database
    .delete(songTable)
```

The cascade is written out explicitly, which is the second half of the bullet. But four tables are deleted on the bare client with no `database.transaction`, so a failure partway leaves mastery overrides and setlist entries gone and the song still there. The sibling `deleteMemberWithLinks` in `members.repository.ts:96` does this correctly, and this branch added its two new cascades inside that transaction — the same two cascades were added here outside one. Wrapping these four statements in `database.transaction` and passing the executor down is the fix.

Introduced: pre-existing — the three-table untransacted cascade predates the branch; the branch's diff on this file adds one import and the `deleteVotesOfDeletedSong` line, extending the untransacted set to four tables.
Fix size: one file, no callers

## Sealed

- `apps/pragma/VOCABULARY.md` — every new or reworded definition checked against code. *Member credential*: `memberId` primary key, `member_credential_username_idx` is a unique index in migration 0004, the 2-64 character rule matches `usernameSchema`, and the delete is inside `deleteMemberWithLinks`' transaction. *Passkey*: `member_passkey_credential_id_idx` is unique, the two-minute challenge matches `CHALLENGE_TTL_MS = 120_000`. *Setlist status*: nullable with no default in both the migration and the Drizzle table, `resolveSetlistStatus` reads null as `locked`, reopening keeps every vote. *Vote*: composite key and the 0-3 range match, and `selectScoreWriteIntent` does delete on zero. *Sign-in session*: every domain router now opens with `requireMemberSession` — checked in all ten controllers.
- `apps/pragma/api/src/auth/auth.controller.ts` — three split routers, the gate applied only on the rotate chain; the clock and the rate-limit store arrive through options, which is what the blueprint it declares describes.
- `apps/pragma/api/src/auth/member-session.middleware.ts` — the blueprint it declares is accurate: two separate reads, every failure answers rather than calling `next`.
- `apps/pragma/api/src/auth/credentials.service.ts`, `passkey.service.ts`, `me/me.service.ts` — orchestration only; every outcome is a discriminated union, no database client.
- `apps/pragma/api/src/auth/enrolment.core.ts`, `member-session.core.ts`, `passkey.core.ts`, `helpers/json/json.core.ts` — pure, no `new Date()`, `now` is a parameter everywhere it is needed. `passkey.core.ts` parses untrusted WebAuthn payloads through Zod rather than annotating them, which is the second typing bullet.
- `apps/pragma/api/src/auth/session-cookie.utils.ts` — `.utils.ts` rather than `.core.ts` is the right side of that choice: a signed cookie is cross-cutting machinery, not a word the band would recognise.
- `apps/pragma/api/src/setlists/voting.core.ts`, `voting.service.ts`, `voting.repository.ts` — the repository returns rows and counts and never projects; `replaceEntriesWithProposal` opens the multi-table write in one transaction, which standard 11 places in the repository.
- `apps/pragma/api/src/members/members.repository.ts` — the two new cascades land inside the existing transaction.
- `apps/pragma/api/src/setlists/setlists.controller.ts`, and `bars`, `instruments`, `mastery`, `members`, `sessions`, `songs`, `transitions`, `uploads` controllers — dispatch only; the diff on the seven is a one-line middleware swap.
- `apps/pragma/site/src/components/organisms/VoteDeck.tsx` — the pointer bullet holds: `startDrag` writes only geometry and the dragging flag, and the score is committed in `endDrag` on `pointerup`. See *Outside the checklist* on `pointercancel`.
- `apps/pragma/site/src/components/organisms/VoteClosePanel.tsx`, `VoteProposalRow.tsx`, `VoteTally.tsx` — `isFirst`/`isLast` are position facts, not a boolean family standing in for a variant string; no component here has more than two visual variants, so `cva` is not owed.
- `apps/pragma/site/src/routes/setlists/vote-deck.core.ts`, `vote-proposal.core.ts`, `setlist-vote.core.ts`, `setlist-status.core.ts`, `routes/login.core.ts` — pure, and each name says what it decides.
- `apps/pragma/site/src/i18n/*` (via the components that read them) — every new key is `voting.*`, `auth.*` or `account.*` with a second segment naming the element (`voting.budgetLabel`, `voting.closeSubmit`, `account.removePasskey`), which is the shape the i18n bullet asks for.

## Unclear

- Nothing. The one bullet I could not exercise directly is "every screen holds together at 375 pixels", which wants `agent-browser` and `scripts/argent.sh` against a running preview. The branch carries a visual-validation report with thirty-two screenshots at 375 px and one at 1280 px under `docs/features/pragma/member-accounts-and-setlist-voting/validation/`, and every layout-bearing class I read is mobile-first with `sm:`/`lg:` opt-ins, so I did not treat it as unresolved — but I did not drive a browser myself, and that verdict rests on someone else's run.

## Outside the checklist

- `VoteDeck.tsx:126` — `onPointerCancel={endDrag}` runs the same handler as `onPointerUp`, so a cancelled gesture commits a score if the card had already crossed the 25% threshold. `touch-none` on the card should stop the browser ever ruling it a scroll, so this is latent rather than live, but a cancel is the browser saying the gesture was not the user's, and returning the card would be the honest response. The bullet only forbids writing on `pointerdown`, which this does not do.
- `apps/pragma/api/src/auth/passkey.service.ts:69` — `startPasskeyRegistration` answers `{ kind: 'unknown-member' }` when the generated options carry no challenge, which is not what happened and surfaces to the caller as a 404. A distinct outcome would say the truth.
- `apps/pragma/api/src/me/me.service.ts:4-11` — the module is mostly a re-export barrel over `../auth/*`. The `me` slice owns one function and forwards five, which makes the bounded context a facade rather than a slice. Nothing in the standards forbids it.
- `apps/pragma/site/src/routes/setlists/setlist-status.core.ts` duplicates `SETLIST_LOCKED`, `SETLIST_VOTING` and `resolveSetlistStatus` from `apps/pragma/api/src/setlists/setlists.core.ts`. CLAUDE.md places a rule both sides read in `apps/pragma/domain/`, which exists and is reachable through `@domain/*`; there is a real caller on each side.
- `apps/pragma/api/src/me/me.controller.ts:52-58` duplicates the `writeSessionCookie` body from `auth.controller.ts:27-33`. Two copies of a cookie policy drift silently.
- `apps/pragma/cdk/lib/stack.ts` — the preview clone moves `app_config` from `tablesToReplace` to `tableBlocklist`. That is a property change worth naming in the commit body: a preview stack no longer inherits a replaced `app_config` row and must be bootstrapped, and `member_credential` is blocked too, so no preview inherits prod's members' passwords. That is the safer behaviour, but it is a behaviour change a future operator will meet as "the preview will not let me in".
- `apps/pragma/api/src/__test/test-seed.service.ts:149` — `rotatePassword(SEED_ADMIN_PASSWORD, now)` immediately after `bootstrapAuth` with the same password. It does mint a fresh HMAC key, so it is not a no-op, but nothing in the file says why the seed wants one.
