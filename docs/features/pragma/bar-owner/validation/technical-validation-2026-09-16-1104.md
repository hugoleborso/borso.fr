# Technical validation — Bar owner / Outreach message / Adding a bar from the map / Qualifying a bar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/pragma-bar-owner-feature-tt90g7`
- Base: `origin/main`
- Run at: 2026-09-16T11:04:00Z
- Touched workspaces: `@borso-app/pragma` (api + site), plus `scripts/architecture/manifests` and `docs/`

The spec carries no *Test strategy* section, so no assertion list was authored for
`/visual-validation`. Routing was therefore done by nature: every assertion that needs a
browser to answer (column visibility at 375 px vs desktop, the attribution line being
readable, the copy button's feedback appearing on screen) is tagged **VISUAL** below and
was checked by the two visual reports already on this branch
(`visual-validation-2026-09-16-1020.md` and `-1041.md`). 6 assertions routed to
`/visual-validation`; out of scope for this report. Everything else is verified here.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Bar owner / Decision | Column is `owner_member_id`, nullable uuid on `bar` | `apps/pragma/api/src/database/migrations/0009_bar_owner.sql:9` | `ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "owner_member_id" uuid;` | PASS |
| A02 | Bar owner / Rules | At most one owner, optional | `apps/pragma/site/src/routes/bars/bars-page.core.ts` + `bar-form.core.ts` | single `ownerMemberId` scalar; `selectOwnerName` answers `null` for a bar nobody owns and for an owner who is gone (tests at `bars-page.core.test.ts`) | PASS |
| A03 | Bar owner / Rules | Owner picked from the band's members, on the bar form beside the status | `apps/pragma/site/src/components/organisms/BarForm.tsx` | owner `<select>` fed by the members list, beside status | PASS |
| A04 | Bar owner / Rules | List shows owner in its own column | `apps/pragma/site/src/components/organisms/BarsList.tsx:99-108` | `id: 'owner', accessorFn: (row) => row.ownerName ?? '', header: () => t('bars.owner')` | PASS |
| A05 | Bar owner / Rules | Kanban card shows the owner under the contact line | `apps/pragma/site/src/components/organisms/BarsKanban.tsx:78` | `{card.ownerName ?? t('bars.ownerNone')}` | PASS |
| A06 | Bar owner / Rules | At phone width the owner reads under the bar's name, never only behind a tap | `apps/pragma/site/src/components/organisms/BarsList.tsx:20,75-77` | `MOBILE_HIDDEN_COLUMN_IDS = new Set(['city','capacity','owner','mood'])` and `<span className="md:hidden …">{row.original.ownerName ?? t('bars.ownerNone')}` | PASS |
| A07 | Bar owner / Rules | Deleting a member clears the owner, deletes no bar | `apps/pragma/api/src/members/members.repository.ts:106,127-128` | `await unassignBarsOwnedByMember(transaction, id);` … `.set({ ownerMemberId: null }).where(eq(barTable.ownerMemberId, memberId))`, inside the same transaction | PASS |
| A08 | Outreach / Decision | One application-wide template with `{{bar}}`, `{{phone}}`, `{{email}}` | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:3-7` | `OUTREACH_PLACEHOLDERS = { bar: '{{bar}}', phone: '{{phone}}', email: '{{email}}' } as const` | PASS |
| A09 | Outreach / Rules | Editing and saving replaces it for everyone (single row) | `apps/pragma/api/src/outreach/outreach.repository.ts:21-22` | `.values({ id: OUTREACH_TEMPLATE_ROW_ID, body }).onConflictDoUpdate({ target: outreachTemplateTable.id, set: { body } })` | PASS |
| A10 | Outreach / Rules | Until someone saves, the template is the translated default | `apps/pragma/site/src/routes/bars/BarsPage.tsx:142-145`; `i18n/en.json:67`, `fr.json:67` | `selectOutreachTemplate(outreachTemplateQuery.data?.body ?? null, t('bars.outreachDefaultTemplate'))`, key present in both catalogues | PASS |
| A11 | Outreach / Rules | `{{phone}}` / `{{email}}` come from the signed-in member, filled on the account page | `apps/pragma/site/src/routes/bars/BarsPage.tsx:149-150`; `apps/pragma/api/src/me/me.controller.ts:39`; `AccountPage.tsx:50` | `phone: signedInMember.data?.phone ?? null, email: signedInMember.data?.email ?? null`; `.put('/contact', zValidator('json', memberContactSchema), …)`; `<ContactDetailsForm` | PASS |
| A12 | Outreach / Rules | A detail not filled in renders as a visible mark, not an empty gap | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:15-19` | `const MISSING_CONTACT_MARK = '…';` … `value === null \|\| value.length === 0 ? MISSING_CONTACT_MARK : value` | PASS |
| A13 | Outreach / Rules | A refused clipboard is reported in the page, not thrown | `apps/pragma/site/src/lib/clipboard.adapter.ts:9-14`; `BarsPage.tsx:153-154` | `try { await navigator.clipboard.writeText(text); return true; } catch { return false; }`; `setCopyMessage(isCopied ? t('bars.outreachCopied') : t('bars.outreachCopyFailed'))` | PASS |
| A14 | Outreach / Out of scope | No sending — copy only | `BarsPage.tsx:147-155` | the handler ends at `didCopyTextToClipboard`; no mail transport anywhere in the diff | PASS |
| A15 | Map / Rules | The search runs through this application's API, behind the same session as every other bars route | `apps/pragma/api/src/bars/bars.controller.ts:27-30` | `.get('/search', zValidator('query', barSearchQuerySchema), …)` inside the bars router, which carries `requireMemberSession`; covered by `bars.controller.test.ts:19` | PASS |
| A16 | Map / Rules | One-per-second spacing and the cache the usage policy requires are enforced server-side | `apps/pragma/api/src/bars/bar-search.adapter.ts:14-15,73-77,84` | `SEARCH_CACHE_TTL_MS = 3_600_000; SEARCH_MIN_INTERVAL_MS = 1_000;` … `await waitForRateSlot(state, now); state.lastCallAt = now();` … `state.cache.set(cacheKey, { value: [...hits], expiresAt: now() + SEARCH_CACHE_TTL_MS })` | PASS |
| A17 | Map / Rules | The search card carries the OpenStreetMap attribution | `apps/pragma/site/src/components/organisms/BarPlaceSearch.tsx:13,92-101`; `i18n/en.json:73` | `href={OPENSTREETMAP_COPYRIGHT_URL}` … `{t('bars.searchAttribution')}` → `"Search data © OpenStreetMap contributors"` | PASS |
| A18 | Map / Rules | Picking a result always prepares a **new** bar, even while another is open | `apps/pragma/site/src/routes/bars/bar-form.core.ts:157-165`; `BarsPage.tsx:284` | `return { ...blank, id: null, name: pick.name, … }`; `setFormInitial(buildBarFormFromPlace(hit, BLANK_BAR_FORM))` | PASS |
| A19 | Map / Rules | A field the place does not carry is left empty, never guessed | `bar-form.core.ts:162-163`; `bar-search.core.ts:38-56` | `city: pick.city ?? '', contactPhone: pick.phone ?? ''`; `selectCity` / `selectPhone` return `null` rather than inventing | PASS |
| A20 | Map / Rules | A search the service does not answer says so in one sentence; the rest of the page keeps working | `bar-search.adapter.ts:81`; `BarPlaceSearch.tsx:64-67` | `if (!response.ok) return { kind: 'unavailable' };` and `<p … role="alert">{t('bars.searchFailed')}</p>` — a local `<p>` inside the search card only | PASS |
| A21 | Map / Out of scope | No coordinates stored, no duplicate detection, no enrichment | `bar-search.core.ts:16-22` | `BarSearchHit` carries `placeId, name, address, city, phone` — no lat/lon; nothing in the diff writes a place | PASS |
| A22 | Qualify / Decision | Mood is one of three; support is any number of three | `apps/pragma/api/src/bars/bar-support.core.ts:3-4` | `CONCERT_MOODS = ['chill','gig','ticketed'] as const; AVAILABLE_SUPPORTS = ['pa-system','lights','sound-engineer'] as const;` | PASS |
| A23 | Qualify / Decision | A bar nobody judged has no mood, which is not a fourth mood | `bar-support.core.ts:22-25` | `resolveConcertMood` returns `ConcertMood \| null` via `safeParse`; the enum stays three wide | PASS |
| A24 | Qualify / Rules | Mood single choice, support multiple, both on the bar form beside the status | `apps/pragma/site/src/components/molecules/BarQualificationFields.tsx` | mood `<select>` + support checkboxes, rendered by `BarForm` beside the status | PASS |
| A25 | Qualify / Rules | The list shows the mood in its own column, sortable | `BarsList.tsx:110-117` | `id: 'mood', accessorFn: (row) => row.moodLabel ?? '', header: () => t('bars.mood'), … enableSorting: true` | PASS |
| A26 | Qualify / Rules | The kanban card shows the mood beside the owner; at phone width it reads under the bar's name beside the owner | `BarsKanban.tsx:78-79`; `BarsList.tsx:76-77` | `{card.ownerName ?? …}{card.moodLabel === null ? '' : \` · ${card.moodLabel}\`}` and the same pair inside the `md:hidden` span | PASS |
| A27 | Qualify / Rules | A bar recorded before this feature reads as no mood and no support, not an error | `migrations/0011_…sql:14-16`; `bar-support.core.ts:22-25` | both columns added nullable; `resolveConcertMood(null)` → `null`, empty support list is the default (covered by `bars.controller.test.ts:95`) | PASS |
| A28 | Plan / Vocabulary | `apps/pragma/VOCABULARY.md` carries owner, mood, support, place and the outreach template | `apps/pragma/VOCABULARY.md` (diff) | `` `ownerMemberId` names the one band member carrying the conversation with that venue `` + `## Outreach template` section with its "Not to be confused with" | PASS |
| A29 | Plan / ADR | ADR-0018 records why Nominatim rather than Google | `docs/adr/0018-nominatim-answers-the-bar-search.md:1-16`; `docs/adr/README.md` | `# ADR-0018: Nominatim answers the bar search, proxied through the API`, indexed in the README | PASS |
| A30 | Plan / Architecture | The external system is declared in the manifest and tagged in code | `scripts/architecture/manifests/pragma.manifest.ts` (diff); `bar-search.adapter.ts:2`; `clipboard.adapter.ts:6` | `id: 'openstreetmap-nominatim'` and `id: 'browser-clipboard'` added; `@DependsOnExternal openstreetmap-nominatim` / `@DependsOnExternal browser-clipboard` — cross-check passes (see B09) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean (the repo's only linter — CLAUDE.md; the agent standard's Biome reference does not apply here) | `pnpm exec eslint <32 changed ts/tsx files>` | exit 0, no findings | PASS |
| B02 | Prettier clean | `pnpm exec prettier --check <changed non-md/png/sql files>` | `All matched files use Prettier code style!`, exit 0 | PASS |
| B03 | `knip` clean (no unused export / dependency) | `pnpm exec knip` | exit 0; only pre-existing configuration hints, none from this diff | PASS |
| B04 | No `any`, no type assertions beyond `as const` / `as unknown` | `grep -nE '\bas [A-Z]\|: any\b\|<any>'` over changed ts/tsx | no matches; the one vendor body is `const nominatimBody: unknown = await response.json()` (`bar-search.adapter.ts:82`) then Zod-parsed | PASS |
| B05 | No comments in linted source | `borso/no-comments` via B01 | exit 0; the `@Blueprint` / `@DependsOnExternal` / `@Feature` blocks are machine-read annotations, explicitly exempt. The three `.sql` headers are not linted source and match the precedent set by `0001_song_metadata.sql` and `0008_tasks_and_song_origin.sql` | PASS |
| B06 | No single-letter locals | `grep -nE '\b(const\|let) [a-z] ='` over changed ts/tsx | none found; names read `candidate`, `cacheKey`, `trimmed`, `nominatimBody`, `hits` | PASS |
| B07 | Magic numbers and strings get names | read of the new adapters/cores | `SEARCH_CACHE_TTL_MS`, `SEARCH_MIN_INTERVAL_MS`, `SEARCH_RESULT_LIMIT`, `NOMINATIM_USER_AGENT`, `DEBOUNCE_MS = 600`, `OPENSTREETMAP_COPYRIGHT_URL`, `MISSING_CONTACT_MARK`, `OUTREACH_TEMPLATE_ROW_ID`, `MOBILE_HIDDEN_COLUMN_IDS` | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read of every indexed access in the diff | `rows[0]?.body ?? null` (`outreach.repository.ts:14`); `const [row] = …; if (row === undefined) throw` (`:19-24`); `address[key]` / `extratags[key]` both guarded by `!== undefined` (`bar-search.core.ts:41-42,52-53`) | PASS |
| B09 | Repo gates: blueprint index, architecture graph, convention drift | three `--check` runs | `Annotations are complete and the index is up to date.` (exit 0); `pragma: 367 files across 4 levels and 17 slices.` (exit 0); `No question gained a new answer.` (exit 0) | PASS |
| B10 | **`useEffect` is a smell** | `grep -nE '\buseEffect\('` over every changed `.ts`/`.tsx` under `site/` | **no matches at all.** The 600 ms debounce is a `useMemo`-held `debounce` helper driven by the input's `onChange` (`BarPlaceSearch.tsx:31-42`), not an effect watching state | PASS |
| B11 | Controllers are dispatchers | read of `outreach.controller.ts`, `bars.controller.ts`, `me.controller.ts` | `outreach.controller.ts:11-17` is validate → call service → `context.json(…)`, no derivation; carries `// @FollowsBlueprint controller-dispatch` | PASS |
| B12 | Back-end vertical slice, correct layer suffixes | file list | `api/src/outreach/{schema,repository,service,controller}.ts` — a new bounded context with the layered triad, no horizontal aggregator folder; `bar-search.core.ts` / `.adapter.ts` sit inside the owning `bars/` context | PASS |
| B13 | Forms use `@tanstack/react-form`, not `useState` chains | `grep useState / useForm` on the two new form organisms | `OutreachTemplateCard.tsx` and `ContactDetailsForm.tsx` each have **0** `useState` and `const form = useForm({…})` | PASS |
| B14 | Styling is inline Tailwind, no bare CSS files | changed-file list | no `.css` file added or touched; every new component styles inline (`className="text-xs text-ink-500"` etc.) | PASS |
| B15 | Atomic design buckets | changed-file list | `molecules/BarQualificationFields.tsx`; `organisms/{BarPlaceSearch,ContactDetailsForm,OutreachTemplateCard}.tsx` — no flat `components/`, no `ui/` or `shared/` | PASS |
| B16 | i18n — no hard-coded user-facing string | read of the new components | every label goes through `t('bars.…')` / `t('common.…')`, and each new key exists in both `en.json` and `fr.json` (e.g. `searchAttribution` and `outreachDefaultTemplate` at line 73 / 67 of each) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | `@borso-app/pragma` (unit + per-file coverage gate) | `pnpm --filter @borso-app/pragma run test:core` | 0 — **148 test files, 1516 tests passed**, coverage gate satisfied | PASS |
| C02 | `@borso-app/pragma` (back-e2e over the sandbox Postgres) | `pnpm --filter @borso-app/pragma run test` | 0 — **19 test files, 126 tests passed**, 119.44 s | PASS |
| C03 | Coverage-gated pure files: every new `*.core.ts` / `*.adapter.ts` has a sibling test | file enumeration + C01 | `bar-search.core.test.ts`, `bar-search.adapter.test.ts`, `bar-support.core.test.ts`, `outreach-message.core.test.ts`, `clipboard.adapter.test.ts` — all five present and picked up; no new `*.utils.ts` in the diff | PASS |
| C04 | `infra/*` untouched by this diff | changed-file list | no file under `infra/`; `@borso/infra` is only *built* as a prerequisite of `test:core`, which succeeded | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | A bar carries an optional owner, carried through create and patch | `it('carries the owner through create and clears it when that member goes')` at `apps/pragma/api/src/bars/bars.controller.test.ts:31` | PASS |
| D02 | Deleting a member clears the owner on the bars they owned and deletes no bar | same back-e2e test, `bars.controller.test.ts:31` (asserts the bar survives with a null owner) | PASS |
| D03 | The list/kanban resolve the owner's name from the member list | `it('names the member the bar points at')` at `bars-page.core.test.ts` (`describe('selectOwnerName')`) | PASS |
| D04 | A bar nobody owns reads as no owner | `it('has no name for a bar nobody owns')` at `bars-page.core.test.ts` | PASS |
| D05 | A stale owner id (member gone outside the delete path) renders as no owner, not an error — the plan's named risk | `it('has no name for an owner who is gone')` at `bars-page.core.test.ts` | PASS |
| D06 | The kanban card projection carries the owner | `it('names the owner the caller resolves')` at `bars-page.core.test.ts` (`describe('buildKanbanCardsByStatus owner projection')`) | PASS |
| D07 | The template renders `{{bar}}`, `{{phone}}`, `{{email}}` | `it('names the bar and signs with the member contact details')` at `apps/pragma/site/src/routes/bars/outreach-message.core.test.ts:12` | PASS |
| D08 | A placeholder is replaced everywhere it appears | `it('replaces the bar placeholder everywhere it appears')` at `outreach-message.core.test.ts:22` | PASS |
| D09 | A contact detail not filled in renders as a visible mark | `it('marks a contact detail the member has not filled in')` at `outreach-message.core.test.ts:29` | PASS |
| D10 | Until someone saves, the template is the translated default | `it('falls back when nothing was ever saved')` at `outreach-message.core.test.ts:44` and `it('falls back on an empty saved template')` at `:48` | PASS |
| D11 | The template is a single application-wide row; saving replaces it | `it('overwrites the single template row rather than adding a second one')` at `apps/pragma/api/src/outreach/outreach.controller.test.ts:45`, with `it('has no template until the band writes one, then serves what it saved')` at `:20` | PASS |
| D12 | The template routes sit behind the member session | `it('rejects a read without a session cookie')` at `outreach.controller.test.ts:15` | PASS |
| D13 | An empty template is refused | `it('refuses an empty template')` at `outreach.controller.test.ts:61` | PASS |
| D14 | The member saves their own phone and email from the account page, and reads them back | `it('saves the details the outreach message is signed with, and reads them back')` at `apps/pragma/api/src/me/me.controller.test.ts:40`; partial writes and clearing covered at `:61` and `:80`; validation at `:98` and `:108`; session at `:21` | PASS |
| D15 | A refused clipboard is reported, not thrown | `it('reports a refused clipboard rather than throwing')` at `apps/pragma/site/src/lib/clipboard.adapter.test.ts:21`, with the success path at `:13` | PASS |
| D16 | The search reads name, city and phone out of a place | `it('reads the fields a bar record needs out of a place')` at `apps/pragma/api/src/bars/bar-search.core.test.ts:13`, with the city fallback chain at `:25`/`:36`/`:43` and the phone tags at `:50` | PASS |
| D17 | A field the place does not carry is left empty, never guessed | `it('leaves a field the place does not know empty')` at `bar-form.core.test.ts` (`describe('buildBarFormFromPlace')`), plus `it('has no city when the place carries no address, or none naming one')` at `bar-search.core.test.ts:43` | PASS |
| D18 | Picking a result always prepares a **new** bar | `it('always builds a new bar, never an edit of the one on screen')` at `bar-form.core.test.ts` | PASS |
| D19 | A search the service does not answer says so, rather than reading as no result | `it('names a refused call unavailable rather than answering no result')` at `bar-search.adapter.test.ts:44`; an unexpected body answers an empty list, `bar-search.core.test.ts:69` | PASS |
| D20 | The usage policy's one-per-second spacing is enforced | `it('spaces two different queries by the second the usage policy asks for')` at `bar-search.adapter.test.ts:81`, with the no-wait path at `:99` | PASS |
| D21 | The usage policy's caching is enforced, and expires | `it('serves a repeated query from the cache, which the usage policy requires')` at `bar-search.adapter.test.ts:53`, `it('keys the cache on the lowercased query')` at `:63`, `it('asks again once the cached answer has expired')` at `:71` | PASS |
| D22 | The search sits behind the same session as every other bars route | `it('keeps the place search behind the same session as every other bars route')` at `bars.controller.test.ts:19` | PASS |
| D23 | The mood is one of three and a null/unknown value reads as not known yet | `it('names every mood the column may hold')` at `bar-support.core.test.ts:30` and `it('reads a null or unknown mood as not known yet')` at `:36` | PASS |
| D24 | The support is a multiple choice, kept in a canonical order and without duplicates | `it('reads back in the declared order, whatever order it was given')` at `bar-support.core.test.ts:5`, `it('keeps each support once')` at `:12`, `it('keeps every support the bar lends')` at `:16` | PASS |
| D25 | A bar that lends nothing has an empty list, which is the default | `it('answers an empty list for a bar that lends nothing')` at `bar-support.core.test.ts:24` and `it('defaults a bar nobody qualified to no mood and no support')` at `bars.controller.test.ts:95` | PASS |
| D26 | The mood and support round-trip through the API | `it('keeps the mood and the support a bar was qualified with')` at `bars.controller.test.ts:65` | PASS |
| D27 | A support the band does not name is refused | `it('rejects a support the band does not name')` at `bars.controller.test.ts:109` | PASS |
| D28 | The form's mood/support controls behave (toggle, order, empty choice, refusal) | `describe('toggleSupport')` (3 tests) and `describe('parseConcertMood')` (3 tests) in `bar-form.core.test.ts` | PASS |
| D29 | The mood label is attached in the page, keeping the projection pure | `it('labels the mood through the caller, which owns the translations')` and `it('leaves a bar whose mood is not known yet unlabelled')` in `describe('addMoodLabelToCards')` at `bars-page.core.test.ts` | PASS |
| D30 | *Routed to `/visual-validation`*: owner/mood columns visible at 1280 px and collapsed under the bar name at 375 px; the mood column sorts; the OpenStreetMap attribution is readable on the card; the copy feedback appears in the page; the French default template renders | — (see `visual-validation-2026-09-16-1041.md`, shots 02/03/05/06/08/15) | n/a — out of scope |

## Notes

- No FAIL and no UNVERIFIABLE row. Both test suites are green (1516 unit + 126 back-e2e),
  ESLint, Prettier, knip and the three repo `--check` generators all exit 0.
- **The spec has no *Test strategy* section.** This is not a defect in the code and did not
  block validation — the implementation covers every behavioural assertion the spec states,
  and the routing between this report and `/visual-validation` was unambiguous by nature.
  It is worth noting for the next spec: the section is what makes the split between the two
  validators authoritative rather than inferred.
- **A17 is attested by code, not by a gate.** The spec itself says the attribution "no test
  can check"; the evidence here is the rendered `<a>` plus the catalogue string in both
  languages, and the visual report's shot of the search card.
- **A01/A16 carry the plan's acknowledged risk, unchanged.** `owner_member_id` has no
  foreign key, because DSQL's `ADD COLUMN` accepts no constraint clause. The mitigation the
  plan named is implemented and tested: the delete path clears it in-transaction (A07/D02)
  and the front end renders an unknown owner as no owner (D05). This is a deliberate,
  documented trade-off, not a finding.
- The back-e2e run wiped the sandbox Postgres the dev server on ports 5174/3001 shares,
  which was flagged as expected.

## Verdict: PASS
