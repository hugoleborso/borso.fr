# Technical validation — Bar owner / Outreach message / Adding a bar from the map / Qualifying a bar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/pragma-bar-owner-feature-tt90g7`
- Base: `origin/main`
- HEAD at validation: `7ed50d5`
- Run at: 2026-09-16T10:19Z (suites re-run at `7ed50d5` after a new commit landed mid-run)
- Touched workspaces: `apps/pragma` (`@borso-app/pragma`), plus `docs/` and `scripts/architecture/manifests/`

The spec carries **no Test strategy section**, so no authoritative routing between this
report and `/visual-validation` exists. Rows below cover the assertions testable without a
browser; DOM-rendered behaviours (the owner column on screen, the mood chip, the search
card's attribution link, the in-page copy/refusal messages) are treated as
`/visual-validation`'s and are not tagged UNVERIFIABLE here. One row records the missing
section itself.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Bar owner / Decision | Column is `owner_member_id`, nullable uuid | `apps/pragma/api/src/database/migrations/0006_bar_owner.sql:9` | `ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "owner_member_id" uuid;` | PASS |
| A02 | Bar owner / Rule 1 | Owner optional, at most one | `apps/pragma/api/src/bars/bars.schema.ts:24,46` | `ownerMemberId: uuid('owner_member_id'),` / `ownerMemberId: z.string().uuid().nullable().default(null),` | PASS |
| A03 | Bar owner / Rule 2 | Owner picked from members, on the form beside the status | `apps/pragma/site/src/components/organisms/BarForm.tsx:180-196` | `<option value="">{t('bars.ownerNone')}</option>` … `{owners.map((owner) => (<option key={owner.id} value={owner.id}>{owner.firstName}</option>))}` | PASS |
| A04 | Bar owner / Rule 3 | List shows owner first name in its own column | `apps/pragma/site/src/components/organisms/BarsList.tsx:95-103` | `id: 'owner', accessorFn: (row) => row.ownerName ?? '', header: () => t('bars.owner'),` | PASS |
| A05 | Bar owner / Rule 3 | Kanban card shows the owner under the contact line | `apps/pragma/site/src/components/organisms/BarsKanban.tsx:77-80` | `{card.ownerName ?? t('bars.ownerNone')}` rendered after the `card.contactName` block | PASS |
| A06 | Bar owner / Rule 4 | Deleting a member clears the owner, deletes no bar | `apps/pragma/api/src/members/members.repository.ts:105,119-126` | `await unassignBarsOwnedByMember(transaction, id);` … `.update(barTable).set({ ownerMemberId: null }).where(eq(barTable.ownerMemberId, memberId));` | PASS |
| A07 | Outreach / Decision | One app-wide template, three placeholders | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:3-7` | `bar: '{{bar}}', phone: '{{phone}}', email: '{{email}}'` | PASS |
| A08 | Outreach / Rule 1 | Single row, saving replaces it for everyone | `apps/pragma/api/src/outreach/outreach.repository.ts:19-23` | `.values({ id: OUTREACH_TEMPLATE_ROW_ID, body }).onConflictDoUpdate({ target: outreachTemplateTable.id, set: { body } })` | PASS |
| A09 | Outreach / Rule 2 | Until saved, the template is the translated default | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:37-39`; `apps/pragma/site/src/i18n/en.json:67` | `return saved === null \|\| saved.length === 0 ? fallback : saved;` with `"outreachDefaultTemplate": "Hey {{bar}}, we're Pragma…"` in both catalogues | PASS |
| A10 | Outreach / Rule 3 | Contact details come from the signed-in member; a missing one renders as a visible mark | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:15-18`; `apps/pragma/site/src/routes/bars/BarsPage.tsx:150-153` | `const MISSING_CONTACT_MARK = '…';` / `phone: signedInMember.data?.phone ?? null,` | PASS |
| A11 | Outreach / Rule 3 | Details are filled in on the account page | `apps/pragma/site/src/routes/account/AccountPage.tsx:47-62`; `apps/pragma/api/src/me/me.controller.ts:39-47` | `<ContactDetailsForm … onSubmit={…saveContactDetails.mutateAsync(…)}` / `.put('/contact', zValidator('json', memberContactSchema), …)` | PASS |
| A12 | Outreach / Rule 4 | A refused clipboard is reported, not thrown | `apps/pragma/site/src/lib/clipboard.adapter.ts:8-14`; `apps/pragma/site/src/routes/bars/BarsPage.tsx:155-156` | `try { await navigator.clipboard.writeText(text); return true; } catch { return false; }` / `setCopyMessage(isCopied ? t('bars.outreachCopied') : t('bars.outreachCopyFailed'));` | PASS |
| A13 | Map / Rule 1 | Search runs through this API, behind the same session | `apps/pragma/api/src/bars/bars.controller.ts:23,27` | `.use('*', requireMemberSession)` then `.get('/search', zValidator('query', barSearchQuerySchema), …)` — declared before `/:id` | PASS |
| A14 | Map / Rule 1 | One-per-second spacing and caching enforced server-side | `apps/pragma/api/src/bars/bar-search.adapter.ts:13-15,72-76` | `const SEARCH_CACHE_TTL_MS = 3_600_000; const SEARCH_MIN_INTERVAL_MS = 1_000;` and `await waitForRateSlot(state, now);` | PASS |
| A15 | Map / Rule 2 | OpenStreetMap attribution on the search card | `apps/pragma/site/src/components/organisms/BarPlaceSearch.tsx:12,90-98` | `const OPENSTREETMAP_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';` with `{t('bars.searchAttribution')}` = `"Search data © OpenStreetMap contributors"` | PASS |
| A16 | Map / Rule 3 | Picking a result always prepares a new bar | `apps/pragma/site/src/routes/bars/bar-form.core.ts:157-165` | `return { ...blank, id: null, name: pick.name, city: pick.city ?? '', contactPhone: pick.phone ?? '' };` | PASS |
| A17 | Map / Rule 4 | A field the place does not carry stays empty | same as A16 | `city: pick.city ?? '', contactPhone: pick.phone ?? ''` — no guessing branch | PASS |
| A18 | Map / Rule 5 | A search the service does not answer says so in one sentence | `apps/pragma/api/src/bars/bars.controller.ts:30`; `apps/pragma/site/src/components/organisms/BarPlaceSearch.tsx:64-67` | `if (outcome.kind === 'unavailable') return context.json({ error: 'search-unavailable' }, 502);` / `<p … role="alert">{t('bars.searchFailed')}</p>` | PASS |
| A19 | Qualifying / Decision | Three moods, three supports, mood nullable, support empty by default | `apps/pragma/api/src/bars/bar-support.core.ts:3-4`; `bars.schema.ts:47-48` | `CONCERT_MOODS = ['chill','gig','ticketed']`, `AVAILABLE_SUPPORTS = ['pa-system','lights','sound-engineer']`; `concertMood: concertMoodSchema.nullable().default(null), availableSupport: availableSupportSchema.default([])` | PASS |
| A20 | Qualifying / Rule 1 | Mood single choice, support multiple, both on the form beside the status | `apps/pragma/site/src/components/molecules/BarQualificationFields.tsx` (`ConcertMoodField` `<select>`, `AvailableSupportField` checkboxes); wired at `BarForm.tsx:161-177` | `<form.Field name="concertMood">` and `<form.Field name="availableSupport">` immediately after the status field | PASS |
| A21 | Qualifying / Rule 2 | List shows the mood in its own sortable column; kanban shows it beside the owner | `apps/pragma/site/src/components/organisms/BarsList.tsx:106-113`; `BarsKanban.tsx:79` | `id: 'mood', … enableSorting: true` / `{card.moodLabel === null ? '' : \` · ${card.moodLabel}\`}` | PASS |
| A22 | Qualifying / Rule 3 | A pre-feature bar reads as no mood and no support | `apps/pragma/api/src/bars/bar-support.core.ts:22-25`; `bars.repository.ts:16-20` | `return mood.success ? mood.data : null;` / `if (raw === null) return [];` | PASS |
| A23 | Plan (all four) | Every "Files to change" row exists in the diff | `git diff origin/main...HEAD --name-status` | 63 files; every plan row (migrations 0006–0008, `outreach/` slice, `bar-search.*`, `bar-support.core.ts`, `BarQualificationFields.tsx`, `BarPlaceSearch.tsx`, `ContactDetailsForm.tsx`, `OutreachTemplateCard.tsx`, both i18n catalogues, `VOCABULARY.md`, ADR-0017) is present | PASS |
| A24 | Plan / ADR | ADR-0017 records the Nominatim choice and manifest declares the external | `docs/adr/0017-nominatim-answers-the-bar-search.md:1`; `scripts/architecture/manifests/pragma.manifest.ts:112-120` | `# ADR-0017: Nominatim answers the bar search, proxied through the API` / `id: 'openstreetmap-nominatim',` matching `@DependsOnExternal openstreetmap-nominatim` in `bar-search.adapter.ts:2` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent, no one-letter locals | read of every changed file | `publishDebouncedQuery`, `unassignBarsOwnedByMember`, `decodeAvailableSupportColumn`, `waitForRateSlot`, `contactOrMark` — no abbreviations or single-letter locals found | PASS |
| B02 | Magic numbers/strings named | grep of changed files | `SEARCH_CACHE_TTL_MS`, `SEARCH_MIN_INTERVAL_MS`, `SEARCH_RESULT_LIMIT`, `DEBOUNCE_MS`, `TEMPLATE_BODY_MAX`, `OUTREACH_TEMPLATE_ROW_ID`, `MISSING_CONTACT_MARK`, `PHONE_MAX/EMAIL_MAX` | PASS |
| B03 | No comments in code | `borso/no-comments` via ESLint on 52 changed TS/TSX files | exit 0; only `@Blueprint` / `@FollowsBlueprint` / `@Feature` / `@DependsOnExternal` annotations present. SQL migrations carry prose headers, which the rule does not cover (`.sql` is outside ESLint and outside `check-no-comments-in-styles-and-markup.sh`) | PASS |
| B04 | Function names describe the result | read | `buildBarFormFromPlace`, `renderOutreachMessage`, `selectOutreachTemplate`, `orderAvailableSupport`, `resolveConcertMood`, `didCopyTextToClipboard`, `addMoodLabelToCards` | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep -nP '\bas\s+(?!const\|unknown)[A-Z]'` on changed files | no matches | PASS |
| B06 | No `any` | `grep -nP ':\s*any\b\|as any\|<any>'` on changed files | no matches | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read of indexed accesses in changed code | `const [row] = …; if (row === undefined) throw …` (`outreach.repository.ts:22-24`), `rows[0]?.body ?? null`, `const [url, init] = fetcher.mock.calls[0] ?? [];` | PASS |
| B08 | ESLint clean | `pnpm exec eslint <52 changed files>` at `7ed50d5` | exit 0 | PASS |
| B09 | Prettier clean | `pnpm exec prettier --check <52 changed files>` | `All matched files use Prettier code style!` | PASS |
| B10 | `useEffect` is a smell | `grep -n 'useEffect(' <changed site files>` | no matches. Reset-on-new-data is done with `key=` (`AccountPage.tsx:49`, `BarsPage.tsx:294`), derivation with `useMemo`, the debounce with a memoised `debounce` helper | PASS |
| B11 | Controllers dispatch only | read of `bars.controller.ts`, `outreach.controller.ts`, `me.controller.ts` | each handler validates, calls a service, shapes the response; no `.map`/`.filter` over domain data | PASS |
| B12 | Vertical slice layout | `apps/pragma/api/src/outreach/` | `outreach.{controller,service,repository,schema}.ts` — no horizontal aggregator folder | PASS |
| B13 | Pure logic in `*.core.ts` / adapters in `*.adapter.ts` | new files | `bar-search.core.ts`, `bar-support.core.ts`, `outreach-message.core.ts` pure; the one outbound call in `bar-search.adapter.ts`, the one clipboard call in `clipboard.adapter.ts` | PASS |
| B14 | Styling is inline Tailwind | changed `.tsx` | no `.css` file added, no `import './x.css'`; classes inline, `composeClassName` / `inputVariants` for composition | PASS |
| B15 | Atomic design buckets | new components | `molecules/BarQualificationFields.tsx`, `organisms/{BarPlaceSearch,ContactDetailsForm,OutreachTemplateCard}.tsx` | PASS |
| B16 | Forms through `@tanstack/react-form`, server state through TanStack Query | `ContactDetailsForm.tsx:26`, `OutreachTemplateCard.tsx:25`, `outreach.queries.ts` | `const form = useForm({ defaultValues, onSubmit })`; reads are `useQuery`, writes `useMutation`; `useSaveOutreachTemplate` settles from the response via `setQueryData`, no refetch | PASS |
| B17 | knip clean | `pnpm exec knip` | exit 0, configuration hints only (pre-existing `.css` notes on all four apps) | PASS |
| B18 | Generator gates | `blueprint-indexing.ts --check`, `architecture-graph.ts --check`, `convention-drift.ts --check`, `check-vocabulary-paths.sh` | `Annotations are complete and the index is up to date.` / `pragma: 340 files across 4 levels and 16 slices.` / `No question gained a new answer.` / `every term names a folder that exists and cites no comment` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (unit + coverage gate) | `pnpm --filter @borso-app/pragma run test:core` | 0 — 137 files, 1427 tests; coverage 100% statements / branches / functions / lines, per-file threshold met | PASS |
| C02 | @borso-app/pragma (back-e2e over sandbox Postgres) | `pnpm --filter @borso-app/pragma run test` | 0 — 17 files, 113 tests | PASS |
| C03 | Every `*.core.ts` / `*.utils.ts` / `*.adapter.ts` touched has its sibling test | file listing | `bar-search.core.test.ts`, `bar-search.adapter.test.ts`, `bar-support.core.test.ts`, `outreach-message.core.test.ts`, `clipboard.adapter.test.ts`, `outreach.schema.test.ts`, plus the extended `bar-form.core.test.ts` / `bars-page.core.test.ts` / `bars.schema.test.ts` | PASS |
| C04 | Suites re-run after the branch moved | `git rev-parse HEAD` = `7ed50d5` before and after both runs | both suites above were executed at `7ed50d5` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D00 | Spec conformance: a Test strategy section routing assertions between the two validators | (absent from `spec/spec.md`) | UNVERIFIABLE |
| D01 | Owner carried through create, cleared when the member is deleted, bar untouched | `it('carries the owner through create and clears it when that member goes')` — `apps/pragma/api/src/bars/bars.controller.test.ts:106` | PASS |
| D02 | Owner name resolved for the list and the card; unknown owner reads as none | `describe('selectOwnerName')` — `apps/pragma/site/src/routes/bars/bars-page.core.test.ts:130-147` (`'has no name for an owner who is gone'`) | PASS |
| D03 | Kanban card projects the owner | `it('names the owner the caller resolves')` — `bars-page.core.test.ts:120` | PASS |
| D04 | Template rendering: bar name, phone, email substituted everywhere | `describe('renderOutreachMessage')` — `apps/pragma/site/src/routes/bars/outreach-message.core.test.ts:10-35` | PASS |
| D05 | A contact detail not filled in renders as a visible mark | `it('marks a contact detail the member has not filled in')` — `outreach-message.core.test.ts:27` | PASS |
| D06 | Until someone saves one, the template is the translated default | `describe('selectOutreachTemplate')` — `outreach-message.core.test.ts:38-50` | PASS |
| D07 | Template is one app-wide row, overwritten on save; empty refused | `it('overwrites the single template row rather than adding a second one')` and `it('refuses an empty template')` — `apps/pragma/api/src/outreach/outreach.controller.test.ts:48,63` | PASS |
| D08 | A refused clipboard is answered, not thrown | `it('reports a refused clipboard rather than throwing')` — `apps/pragma/site/src/lib/clipboard.adapter.test.ts:23` | PASS |
| D09 | `{{phone}}` / `{{email}}` come from the signed-in member, filled in on the account page (persistence) | **(none found)** — no test exercises `PUT /api/me/contact`, `saveOwnContactDetails`, or the `member.phone` / `member.email` columns; `grep -rn "phone" apps/pragma/api/src/**/*.test.ts` returns nothing outside the bars slice | FAIL |
| D10 | Search behind the member session | `it('keeps the place search behind the same session as every other bars route')` — `bars.controller.test.ts:35` | PASS |
| D11 | Nominatim body mapped; city key fallback chain; phone tag fallback; unnamed place dropped; odd body → empty | `describe('mapNominatimToBarSearchHits')` — `apps/pragma/api/src/bars/bar-search.core.test.ts:12-72` | PASS |
| D12 | One-per-second spacing and one-hour cache | `it('spaces two different queries by the second the usage policy asks for')` and `it('asks again once the cached answer has expired')` — `bar-search.adapter.test.ts` | PASS |
| D13 | A search the service does not answer is reported as a refusal, not as no result | `it('names a refused call unavailable rather than answering no result')` — `bar-search.adapter.test.ts:37` | PASS |
| D14 | Picking a result always prepares a new bar; unknown fields stay empty | `describe('buildBarFormFromPlace')` — `apps/pragma/site/src/routes/bars/bar-form.core.test.ts:150-171` (`'always builds a new bar, never an edit of the one on screen'`) | PASS |
| D15 | Mood single choice, support multiple, canonical order, duplicates dropped | `describe('orderAvailableSupport')` and `describe('toggleSupport')` — `bar-support.core.test.ts:4-28`, `bar-form.core.test.ts:173-185` | PASS |
| D16 | Support the band does not name is refused | `it('rejects a support the band does not name')` — `bars.controller.test.ts:184` | PASS |
| D17 | A bar recorded before the feature reads as no mood and no support | `it('defaults a bar nobody qualified to no mood and no support')` — `bars.controller.test.ts:170`; `it('reads a null or unknown mood as not known yet')` — `bar-support.core.test.ts:36` | PASS |
| D18 | Mood and support survive a round trip, and clearing the support keeps the mood | `it('keeps the mood and the support a bar was qualified with')` — `bars.controller.test.ts:140` | PASS |

## Notes

- **D09 (FAIL).** The outreach message's signature is the feature's one cross-slice data path — `member.phone` / `member.email` written on the account page, read by `GET /api/me`, substituted into the template — and nothing exercises it. `apps/pragma/api/src/me/` contains `me.controller.ts` and `me.service.ts` with no sibling test file, and the back-e2e suite has no case hitting `PUT /api/me/contact`. The per-file coverage gate does not catch this: `apps/pragma/vitest.config.ts:22-31` scopes coverage to `*.core.ts`, `*.utils.ts`, `*.adapter.ts` and `*.schema.ts` only, so a controller and a service with zero tests still report a green run. Concretely untested: the 400 on an empty patch, the 404 on an unknown member, the round trip through `members.repository.ts`'s widened `MEMBER_PROJECTION`, and the new `phone`/`email` columns from migration `0007`. The other three features each got a back-e2e case; this one is the gap. A single case in a new `apps/pragma/api/src/me/me.controller.test.ts` — save contact details, re-read `GET /api/me`, assert both fields — closes it.
- **D00 (UNVERIFIABLE).** `spec/spec.md` has no *Test strategy* section, so the split between this report and `/visual-validation` was inferred rather than read. Assertions left to the browser pass: the owner column and mood chip rendering at both widths, the search card's attribution link being visible, the copy-confirmation and copy-refusal sentences appearing in the page, and the 375 px layout of the three new cards. If `/visual-validation` did not cover those, they are covered nowhere.
- Observation, no verdict impact: `BarQualificationFields.tsx` throws `new TypeError('unknown concert mood')` inside the mood `<select>`'s `onChange` for a value `parseConcertMood` refuses. The branch is unreachable from the rendered options and is not exercised by any test; it is a defensive throw in a render path rather than a rule violation.
- Process note, no verdict impact: commit `7ed50d5` landed on the branch from a concurrent agent while the first pair of suites was running. Both suites, ESLint and the generator gates were re-run at `7ed50d5`; every result in sections B and C is from that tree.

## Verdict: FAIL
