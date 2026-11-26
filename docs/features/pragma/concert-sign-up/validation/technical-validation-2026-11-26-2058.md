# Technical validation — Concert sign-up page, use case 14 ("Amis par membre", registrations against expected friends)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: claude/concert-friends-registrations
- Base: 5b18439cf0d9d499a8729fb8b75aa842673b6989
- Run at: 2026-11-26T21:01:34Z
- Round: 1
- Reviewed: c81cf8eeeb1e83fa07bbcd6628afa7de57afca50
- Touched workspaces: @borso-app/pragma (site only)

The spec is in the short form: *Use cases* and *Rules*, no Q.O.D., *Changes* or *Test strategy*. Categories A and D are built from use case 14, the only use case the diff adds (one commit, `c81cf8eee`, no merge of `main` above the base). Files are taken from the diff. 6 claims of use case 14 are routed to /visual-validation and are out of scope for this report: the dashed outline in the member's colour as wide as the expected count, the solid bar in that colour as wide as the registrations drawn in front of it, the registrations in bold on each row, the dashed divider before "Sans préf.", the neutral colour of the no-preference bar, and the solid and dashed legend swatches.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/pragma/concert-sign-up/` holds `spec/`, `validation/`, `kaizen.md`, no `plan/` | UNVERIFIABLE |
| A01 | UC14 | The card on the "Détails" tab compares registrations with expected friends | apps/pragma/site/src/components/organisms/SessionDetail.tsx:213-216 | `<ConcertReadView session={session} friendsCard={<ConcertFriendsCard session={session} members={members} />} gearCard={...} />` | PASS |
| A02 | UC14 | Registrations come from the real sign-ups | apps/pragma/site/src/components/organisms/ConcertFriendsCard.tsx:47 | `const registrations = useConcertRegistrations(session.id).data?.registrations ?? NO_REGISTRATIONS;` | PASS |
| A03 | UC14 | The count typed in the edit form, still labelled "Nombre d'amis attendus", is the expected count | ConcertFriendsCard.tsx:52; fr.json:564 | `targets: parseFriendsCounts(session.friendsCountPerMember),`; `"friendsCount": "Nombre d'amis attendus"` unchanged by the diff | PASS |
| A04 | UC14 | One scale for every row, max of every member's registrations, every member's expected count and the no-preference count | apps/pragma/site/src/routes/sessions/friends-count.core.ts:79-82 | `const scaleMax = Math.max(noPreferenceCount, ...counts.flatMap((count) => [count.registered, count.target]));` | PASS |
| A05 | UC14 | All at 0, every bar empty | friends-count.core.ts:20-21 | `if (whole === 0) return NO_SHARE_PERCENT;` | PASS |
| A06 | UC14 | Member row registrations = registrations that chose the member | friends-count.core.ts:63-64, 71-73 | `registrations.filter((registration) => registration.comingFor?.id === memberId).length`; `registered: countComingFor(member.id, input.registrations)` | PASS |
| A07 | UC14 | Dashed outline as wide as expected behind solid bar as wide as registrations | ConcertFriendsCard.tsx:76-87 | `shape="ring" className={composeClassName(BAR_CLASS, EXPECTED_BAR_CLASS)} style={{ width: \`${row.targetPercent}%\` }}` then `shape="cell" ... style={{ width: \`${row.registeredPercent}%\` }}` | PASS |
| A08 | UC14 | Number on the right reads "<registrations> / <expected>", registrations in bold | ConcertFriendsCard.tsx:89-92 | `<b className="font-semibold text-ink">{row.registered}</b>` `<span className="text-ink-soft"> / {row.target}</span>` | PASS |
| A09 | UC14 | "Sans préf." row counts registrations that chose nobody or a member no longer in the band | friends-count.core.ts:77-78; fr.json "friendsNoPreference" | `input.registrations.length - sumOf(counts.map((count) => count.registered))`; `"friendsNoPreference": "Sans préf."` | PASS |
| A10 | UC14 | Legend names the solid swatch "inscrits" and the dashed one "attendus" | ConcertFriendsCard.tsx:117-131; fr.json | `{t('sessions.friendsLegendRegistered')}` / `{t('sessions.friendsLegendExpected')}`; `"friendsLegendRegistered": "inscrits"`, `"friendsLegendExpected": "attendus"` | PASS |
| A11 | UC14 | Header reads "<all registrations> inscrits · <all expected> attendus" | ConcertFriendsCard.tsx:62-65; friends-count.core.ts:89-90 | `<b ...>{tally.registeredTotal}</b>{' '}{t('sessions.friendsRegistered', { count: tally.registeredTotal })} · {tally.targetTotal}{' '}{t('sessions.friendsExpected', ...)}`; `registeredTotal: input.registrations.length, targetTotal: sumOf(Object.values(input.targets))` | PASS |
| A12 | UC14 | Venue line reads all registrations over the capacity | ConcertFriendsCard.tsx:133-139 | `{Math.round(computeSharePercent(tally.registeredTotal, capacity))}% ·{' '}{tally.registeredTotal}/{capacity}` | PASS |
| A13 | UC14 | Subtitle under the title keeps the expected count | SessionDetail.tsx:110-112, 194-199 | `Object.values(friendsCounts).reduce((accumulator, value) => accumulator + value, 0)`; `guestCount: friendsTotal,` | PASS |
| A14 | UC14 | `ConcertReadView` no longer draws the old expected-only card | apps/pragma/site/src/components/organisms/ConcertReadView.tsx:32-33 | `{friendsCard}` `{gearCard}` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the 4 changed source files | none found (`tally`, `counts`, `scaleMax`, `registrations`, `noPreferenceCount`) | PASS |
| B02 | Magic numbers / strings named | read | `NO_FRIEND = 0` (friends-count.core.ts:10), class strings in named constants ConcertFriendsCard.tsx:33-41 | PASS |
| B03 | No prose comments | read | only `/** @Feature sessions */` and `// @FollowsBlueprint ...` | PASS |
| B04 | Function names describe the result | read | `tallyFriends`, `countComingFor`, `sumOf` | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed files | none found | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | only the prose of a test name, friends-count.core.test.ts:39 `'reads any share of nothing as nothing...'` | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read | `input.targets[member.id] ?? NO_FRIEND` (friends-count.core.ts:73); test `tally.rows[0]` used only through `toMatchObject` | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <6 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` | none; derived tally uses `useMemo` (ConcertFriendsCard.tsx:48) | PASS |
| B10 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B11 | knip | `pnpm knip --workspace apps/pragma` | exit 0; the removed `ConcertReadViewMember` export has no remaining importer (`grep -rn ConcertReadViewMember apps/pragma/site/src` empty) | PASS |
| B12 | Standards checklist: "a `find…` returns `null`... a `build…`, `project…` or `select…` returns what its verb says" (01) | read in full | `tallyFriends` returns a `FriendsTally`; `countComingFor` returns a number | PASS |
| B13 | Standards checklist: "a boolean name is not negated" (01) | read in full | `isVenueFillShown` (ConcertFriendsCard.tsx:57) | PASS |
| B14 | Standards checklist: "a file name says what the file holds" / ".core.ts vs .utils.ts" (01, 02) | read in full | the tally of the band's friends sits in `friends-count.core.ts`, a band term | PASS |
| B15 | Standards checklist: "a limit or a rule written in a site does not restate one the API enforces" (02) | read in full | no limit; the tally is display only | PASS |
| B16 | Standards checklist: "a derived type is derived" (03) | read in full | `FriendsRegistration { comingFor: { id } \| null }` (friends-count.core.ts:28-30) is a minimal structural input the Hono-derived `ConcertRegistrationEntry` satisfies, not a mirror of it; the card passes the derived entries straight in | PASS |
| B17 | Standards checklist: "untrusted input is parsed with Zod" (03) | read in full | `parseFriendsCounts(session.friendsCountPerMember)` parses the `unknown` JSON column with `z.record(z.guid(), z.number())` | PASS |
| B18 | Standards checklist: "no new page subtitle, field hint or button label explains the interface" (05) | read in full | the only new prose is the legend, which names two swatches the screen cannot otherwise explain, and the spec asks for it | PASS |
| B19 | Standards checklist: "a prop set has not grown a family of booleans" (05) | read in full | `ConcertReadViewProps` lost four data props and gained one `friendsCard: ReactNode` slot, matching `gearCard` | PASS |
| B20 | Standards checklist: "more than two visual variants go through cva or a lookup record"; "a visual effect is made of what the screen already renders" (08) | read in full | two `MemberMark` shapes (`ring`, `cell`) reuse the existing atom; no conditional styling | PASS |
| B21 | Standards checklist: "a key's dotted path names the screen and the element" (09) | read in full | new keys `sessions.friendsNoPreference`, `sessions.friendsRegistered_*`, `sessions.friendsExpected_*`, `sessions.friendsLegend*` sit beside the existing flat `sessions.friendsCountPerMember` and `sessions.friendsCount` | PASS |
| B22 | Standards checklist: "a test name states the behaviour and the condition" (10) | read in full | e.g. `'puts a registration for a member no longer listed under no preference'`, `'leaves every bar empty when nobody is expected and nobody registered'` | PASS |
| B23 | Blueprints claimed | read against `organism-query-owning`, `core-projection`, `test-component-render`, `test-pure-unit` | the card calls its query hook at organism level like its neighbour `ConcertGearCard`; the projection is pure and covered | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 5b18439cf0d9d499a8729fb8b75aa842673b6989 --coverage --reporter=verbose` | 0 (81 files, 501 tests; ran `ConcertFriendsCard.test.tsx`, `friends-count.core.test.ts`, `SessionDetailPage.test.tsx`; coverage 100% statements 25/25, branches 8/8, functions 12/12, lines 19/19) | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 5b18439cf0d9d499a8729fb8b75aa842673b6989 --reporter=verbose` | 0, "No test files found": the diff touches no API file, so no back-e2e test imports it | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh 5b18439cf0d9d499a8729fb8b75aa842673b6989 apps/pragma` | 0; `friends-count.core.ts` 38 mutants, 38 killed, 0 survived, score 100.00 | PASS |
| C04 | @borso-app/pragma | `*.utils.ts` sibling tests | the diff adds or changes no `*.utils.ts`; the changed gated file `friends-count.core.ts` has its sibling `friends-count.core.test.ts` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC14: the card compares real registrations with the expected counts | `it("reads each member's registrations against the expected count, then those who chose nobody")` at ConcertFriendsCard.test.tsx:56; stubs `/api/concert-registrations/concerts/${SESSION_ID}/registrations`; asserts `expect(screen.getByText('Arn').closest('div')?.textContent).toBe('Arn2 / 5');` (line 73) | PASS |
| D02 | UC14: the edit form's count is the expected count | same test, passes `friendsCountPerMember: { [ARN.id]: 5, [GUI.id]: 4 }` (line 64) and asserts `'Gui1 / 4'` (line 74) | PASS |
| D03 | UC14: one scale, max of members' registrations and expected counts | `it('draws every row on one scale, the largest of all registrations and expected counts')` friends-count.core.test.ts:61; `{ member: OTHER_MEMBER, registered: 4, target: 2, registeredPercent: 50, targetPercent: 25 }` (line 69) | PASS |
| D04 | UC14: a member's registrations above every expected count set the scale | `it('lets a member past the expected count set the scale')` friends-count.core.test.ts:77; `expect(tally.rows[0]).toMatchObject({ registeredPercent: 100, targetPercent: 50 });` | PASS |
| D05 | UC14: the no-preference count sets the scale too | `it('lets the registrations that chose nobody set the scale too')` friends-count.core.test.ts:86; `expect(tally.noPreferencePercent).toBe(100);` and `registeredPercent: 25, targetPercent: 50` | PASS |
| D06 | UC14: all at 0, every bar empty | `it('leaves every bar empty when nobody is expected and nobody registered')` friends-count.core.test.ts:97; `{ member: MEMBER, registered: 0, target: 0, registeredPercent: 0, targetPercent: 0 }` | PASS |
| D07 | UC14: number reads "<registrations> / <expected>" | ConcertFriendsCard.test.tsx:73-74, `toBe('Arn2 / 5')`, `toBe('Gui1 / 4')` | PASS |
| D08 | UC14: "Sans préf." counts registrations that chose nobody | ConcertFriendsCard.test.tsx:75, `expect(screen.getByText('No pref.').closest('div')?.textContent).toBe('No pref.2');` with registrations 3 and 5 at `null` | PASS |
| D09 | UC14: "Sans préf." also counts a member no longer in the band | `it('puts a registration for a member no longer listed under no preference')` friends-count.core.test.ts:106; `expect(tally.noPreferenceCount).toBe(2);` with one `null` and one `DEPARTED_MEMBER_ID` | PASS |
| D10 | UC14: legend names the swatches "inscrits" and "attendus" | (none found). No test reads `sessions.friendsLegendRegistered` or `sessions.friendsLegendExpected`: deleting the legend block at ConcertFriendsCard.tsx:117-131 leaves `ConcertFriendsCard.test.tsx` green, since its only "registered"/"expected" assertion reads the header's `<b>` parent (line 70-72) | FAIL (non-blocking) |
| D11 | UC14: header reads "<all registrations> inscrits · <all expected> attendus" | ConcertFriendsCard.test.tsx:70-72, `expect(screen.getByText('5', { selector: 'b' }).parentElement?.textContent).toBe('5 registered · 9 expected');` | PASS |
| D12 | UC14: venue line reads all registrations over the capacity | ConcertFriendsCard.test.tsx:69, `expect(await screen.findByText('3% · 5/150')).toBeTruthy();` with 5 registrations and 9 expected, so an expected-count line would read `6% · 9/150` | PASS |
| D13 | UC14: the subtitle keeps the expected count | structural: SessionDetail.tsx:197 `guestCount: friendsTotal,` where `friendsTotal` sums `parseFriendsCounts(session.friendsCountPerMember)` (lines 97, 110-112), unchanged by the diff; `selectSessionFacts` pinned by `it('states the capacity and the guests of a concert')` session-facts.core.test.ts:13 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the diff write to a database or keep state? | `git diff <base>...HEAD --name-only -- '*.service.ts' '*.repository.ts' '*.controller.ts'` lists 0 files; `grep -nE '^\+(let \|const [a-zA-Z]+ = new (Map\|Set))\|useState\|localStorage\|insert\(\|update\(\|delete\(\|useMutation'` on the app diff finds nothing. The diff adds one read (`useConcertRegistrations`, an existing GET) and module constants only | PASS |

## Blocking findings

- none

## Non-blocking findings

- D10 — the legend's two labels ("inscrits", "attendus") are rendered but no test reads them; removing the legend leaves every test green.

## Notes

- A00: no plan exists for this change; files and rows were taken from the diff and use case 14. Run `/technical-conception` first if a plan is wanted for later amendments.
- While the registrations request is pending, or after it fails, the card reads `NO_REGISTRATIONS` (ConcertFriendsCard.tsx:47) and shows "0 inscrits", empty solid bars and a 0% venue line, the same as a concert nobody signed up for. The neighbour `ConcertGearCard` does the same, and the spec states no loading or error behaviour. Should a failed read be distinguishable from zero sign-ups?
- `targetTotal` sums every value of `friendsCountPerMember` (friends-count.core.ts:90), including the expected count of a member no longer in the band, while the scale and the rows only read listed members. The header and the subtitle therefore agree with each other, as the spec asks, but can count expected friends that no row shows. Is that the intended reading of "<all expected>"?
- The core names the expected count `target` (`target`, `targetPercent`, `targetTotal`) where the spec, the i18n keys and the edit-form label say "expected". No vocabulary entry defines either word. Should the core follow the spec's word?
- French i18next reads 0 and 1 as the singular form, so the header shows "0 inscrit · 0 attendu" and "1 inscrit". The spec's template writes the plural; the singular is correct French for those counts.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
