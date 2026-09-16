# Technical validation — Bar owner / Outreach message / Adding a bar from the map / Qualifying a bar

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/pragma-bar-owner-feature-tt90g7`
- Base: `origin/main`
- Run at: 2026-09-16T10:09:00Z
- Touched workspaces: `@borso-app/pragma` (api + site), plus docs and `scripts/architecture/manifests/`

**Routing note.** The spec carries no *Test strategy* section, so no authoritative
technical/visual split exists. Category D below covers the assertions that are pure
or deterministic and non-DOM. Nine rendering assertions (owner column visible, mood
chip on the card, attribution link visible, search card layout at 375 px, mobile
column hiding, contact fields on the account page, template editor placement, copy
button placement, error sentence rendered) are browser-runtime and are routed to
`/visual-validation`; they are out of scope for this report and are not tagged here.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Bar owner / Decision | The column is `owner_member_id` on `bar`, pointing at a member | `apps/pragma/api/src/database/migrations/0006_bar_owner.sql:9` | `ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "owner_member_id" uuid;` | PASS |
| A02 | Bar owner / Rules 1 | At most one owner, optional, a bar with no owner is normal | `apps/pragma/api/src/bars/bars.schema.ts:24`, `:46` | `ownerMemberId: uuid('owner_member_id'),` and `ownerMemberId: z.string().uuid().nullable().default(null),` | PASS |
| A03 | Bar owner / Rules 2 | Owner picked from the band's members on the bar form, beside the status | `apps/pragma/site/src/components/organisms/BarForm.tsx:182-195` | `<form.Field name="ownerMemberId">` … `<option value="">{t('bars.ownerNone')}</option>` … `{owners.map((owner) => (<option key={owner.id} value={owner.id}>{owner.firstName}` | PASS |
| A04 | Bar owner / Rules 3 | List view shows the owner's first name in its own column | `apps/pragma/site/src/components/organisms/BarsList.tsx:94-104` | `id: 'owner', accessorFn: (row) => row.ownerName ?? '', header: () => t('bars.owner')` | PASS |
| A05 | Bar owner / Rules 3 | Kanban card shows the owner under the contact line | `apps/pragma/site/src/components/organisms/BarsKanban.tsx:77-80` | `<div className="text-xs text-ink-400 mt-1">{card.ownerName ?? t('bars.ownerNone')}` rendered directly after the `card.contactName` block | PASS |
| A06 | Bar owner / Rules 4 | Deleting a member clears the owner and deletes no bar | `apps/pragma/api/src/members/members.repository.ts:105`, `:119-127` | `await unassignBarsOwnedByMember(transaction, id);` … `.update(barTable).set({ ownerMemberId: null }).where(eq(barTable.ownerMemberId, memberId))` — inside the same `database.transaction` | PASS |
| A07 | Outreach / Decision | One application-wide template with `{{bar}}`, `{{phone}}`, `{{email}}` | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:3-7`; `apps/pragma/api/src/outreach/outreach.schema.ts:10` | `export const OUTREACH_PLACEHOLDERS = { bar: '{{bar}}', phone: '{{phone}}', email: '{{email}}' } as const;` / `export const OUTREACH_TEMPLATE_ROW_ID = 1;` | PASS |
| A08 | Outreach / Rules 1 | Saving replaces the single row for everyone | `apps/pragma/api/src/outreach/outreach.repository.ts:19-23` | `.insert(outreachTemplateTable).values({ id: OUTREACH_TEMPLATE_ROW_ID, body }).onConflictDoUpdate({ target: outreachTemplateTable.id, set: { body } })` | PASS |
| A09 | Outreach / Rules 2 | Until someone saves one, the template is the translated default | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:37-39`; `BarsPage.tsx` template binding | `return saved === null \|\| saved.length === 0 ? fallback : saved;` fed with `t('bars.outreachDefaultTemplate')` | PASS |
| A10 | Outreach / Rules 2 | The default survives i18next interpolation with its placeholders intact | probed: `i18next.t('bars.outreachDefaultTemplate')` | returned `"Hey {{bar}}, we're Pragma, a commercial pop-rock band based "` — placeholders preserved | PASS |
| A11 | Outreach / Rules 3 | Phone and email come from the signed-in member, filled in on the account page | `apps/pragma/api/src/me/me.controller.ts:39-47`; `ContactDetailsForm.tsx:28-31` | `.put('/contact', zValidator('json', memberContactSchema), …  saveOwnContactDetails(memberId, context.req.valid('json'))` / `useForm({ defaultValues: { phone: props.initial.phone, email: props.initial.email } …` | PASS |
| A12 | Outreach / Rules 3 | A missing detail renders as a visible mark, not an empty gap | `apps/pragma/site/src/routes/bars/outreach-message.core.ts:15-19` | `const MISSING_CONTACT_MARK = '…';` … `return value === null \|\| value.length === 0 ? MISSING_CONTACT_MARK : value;` | PASS |
| A13 | Outreach / Rules 4 | A refused clipboard is reported in the page, not thrown | `apps/pragma/site/src/lib/clipboard.adapter.ts:9-14`; `BarsPage.tsx` copy handler | `try { await navigator.clipboard.writeText(text); return true; } catch { return false; }` and `setCopyMessage(isCopied ? t('bars.outreachCopied') : t('bars.outreachCopyFailed'));` | PASS |
| A14 | Map / Rules 1 | The search runs through this API, behind the same session as every other bars route | `apps/pragma/api/src/bars/bars.controller.ts:21`, `:26` | `.use('*', requireMemberSession)` then `.get('/search', zValidator('query', barSearchQuerySchema), …` — registered before `/:id`, so Hono matches it first | PASS |
| A15 | Map / Rules 1 | One-per-second spacing and the cache the usage policy requires are enforced in the adapter | `apps/pragma/api/src/bars/bar-search.adapter.ts:14-15`, `:39-45`, `:70-73` | `const SEARCH_CACHE_TTL_MS = 3_600_000; const SEARCH_MIN_INTERVAL_MS = 1_000;` … `if (elapsed >= SEARCH_MIN_INTERVAL_MS) return;` … `const cached = state.cache.get(cacheKey); if (cached !== undefined) return [...cached.value];` | PASS |
| A16 | Map / Decision + ADR-0017 | The search is backed by OpenStreetMap's Nominatim, and the UI says so | `apps/pragma/site/src/i18n/en.json` `bars.searchTitle`; `fr.json:77` | `"searchTitle": "Find a bar on Google Maps"` / `"searchTitle": "Chercher un bar sur Google Maps"` — the card's own heading names the vendor the spec and ADR-0017 rejected | **FAIL** |
| A17 | Map / Rules 2 | The search card carries the OpenStreetMap attribution | `apps/pragma/site/src/components/organisms/BarPlaceSearch.tsx:13`, `:92-101` | `const OPENSTREETMAP_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';` … `{t('bars.searchAttribution')}` → `"Search data © OpenStreetMap contributors"` | PASS |
| A18 | Map / Rules 3 | Picking a result always prepares a new bar, even while another is open | `apps/pragma/site/src/routes/bars/bar-form.core.ts:152-160`; `BarsPage.tsx` `onPick` | `return { ...blank, id: null, name: pick.name, city: pick.city ?? '', contactPhone: pick.phone ?? '' };` invoked as `setFormInitial(buildBarFormFromPlace(hit, BLANK_BAR_FORM))` | PASS |
| A19 | Map / Rules 4 | A field the place does not carry is left empty, never guessed | `apps/pragma/api/src/bars/bar-search.core.ts:44`, `:55`; `bar-form.core.ts:157-158` | `return null;` at the end of both `selectCity` and `selectPhone`; `city: pick.city ?? '', contactPhone: pick.phone ?? ''` | PASS |
| A20 | Map / Rules 5 | A search the service does not answer says so in one sentence | `apps/pragma/api/src/bars/bar-search.adapter.ts:78`; `BarPlaceSearch.tsx:44`, `:64-74` | `if (!response.ok) return [];` — a refused or errored Nominatim response reaches the component as `search.error === null` with zero hits, so the page renders `t('bars.searchNoResult')` (*"No place matched that search."*) rather than `t('bars.searchFailed')` | **FAIL** |
| A21 | Map / Rules 5 | Every other part of the page keeps working through a failed search | `apps/pragma/site/src/components/organisms/BarPlaceSearch.tsx:64-74` | the error branch renders a `<p role="alert">` inside the card; the query is scoped to this organism and no other panel reads it | PASS |
| A22 | Qualify / Decision | Mood is one of three; a bar nobody judged has no mood | `apps/pragma/api/src/bars/bar-support.core.ts:3`, `:22-25` | `export const CONCERT_MOODS = ['chill', 'gig', 'ticketed'] as const;` … `return mood.success ? mood.data : null;` | PASS |
| A23 | Qualify / Decision | Support is any number of three, empty by default | `apps/pragma/api/src/bars/bar-support.core.ts:4`; `bars.schema.ts:48` | `export const AVAILABLE_SUPPORTS = ['pa-system', 'lights', 'sound-engineer'] as const;` / `availableSupport: availableSupportSchema.default([]),` | PASS |
| A24 | Qualify / Rules 1 | Mood a single choice, support a multiple choice, both on the bar form beside the status | `apps/pragma/site/src/components/molecules/BarQualificationFields.tsx:36-53`, `:78-80` | `<select …  const mood = parseConcertMood(event.target.value);` and `type="checkbox" … onChange={() => onChange(toggleSupport(value, support))}` | PASS |
| A25 | Qualify / Rules 2 | The list view shows the mood in its own column, sortable | `apps/pragma/site/src/components/organisms/BarsList.tsx:105-114` | `id: 'mood', accessorFn: (row) => row.moodLabel ?? '', header: () => t('bars.mood'), … enableSorting: true` | PASS |
| A26 | Qualify / Rules 2 | The kanban card shows the mood beside the owner | `apps/pragma/site/src/components/organisms/BarsKanban.tsx:77-80` | `{card.ownerName ?? t('bars.ownerNone')}{card.moodLabel === null ? '' : ` · ${card.moodLabel}`}` | PASS |
| A27 | Qualify / Rules 3 | A bar recorded before the feature reads as no mood and no support, not an error | `apps/pragma/api/src/bars/bars.repository.ts:14-18`, `:44-45` | `if (raw === null) return [];` … `concertMood: resolveConcertMood(row.concertMood), availableSupport: decodeAvailableSupportColumn(row.availableSupport),` | PASS |
| A28 | Plan — every *Files to change* row | Each planned file exists in the diff at the planned layer | `git diff origin/main...HEAD --name-status` | 56 files; every row of all four plan tables is present, including the three migrations, the `api/src/outreach/` slice, `bar-search.{core,adapter}.ts`, `bar-support.core.ts`, `outreach-message.core.ts`, `clipboard.adapter.ts`, `BarQualificationFields.tsx`, `BarPlaceSearch.tsx`, `OutreachTemplateCard.tsx`, `ContactDetailsForm.tsx`, ADR-0017 and the VOCABULARY entries | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent, no 1-letter locals | read every changed `.ts`/`.tsx` | `orderAvailableSupport`, `decodeAvailableSupportColumn`, `expiredBarSearchCacheKeys`, `unassignBarsOwnedByMember`, `didCopyTextToClipboard`, `selectOwnerName`; locals are `candidate`, `storedValue`, `cacheKey`, `trimmed`, `nominatimBody` | PASS |
| B02 | Function names describe the result | sampled | `buildBarFormFromPlace`, `selectOutreachTemplate`, `addMoodLabelToCards`, `renderOutreachMessage` | PASS |
| B03 | Magic numbers / strings named | read the new adapter and schemas | `SEARCH_CACHE_TTL_MS`, `SEARCH_MIN_INTERVAL_MS`, `SEARCH_RESULT_LIMIT`, `NOMINATIM_USER_AGENT`, `DEBOUNCE_MS`, `MISSING_CONTACT_MARK`, `TEMPLATE_BODY_MAX`, `PHONE_MAX`, `EMAIL_MAX`, `SEARCH_QUERY_MAX`, `OUTREACH_TEMPLATE_ROW_ID` | PASS |
| B04 | No comments in code | `grep -nE '^\s*//'` over the changed `.ts`/`.tsx`, minus `@FollowsBlueprint` and disable directives | `none` — the only prose is in `@Blueprint`/`@BlueprintDescription` annotations and the three `.sql` migrations, which ESLint does not lint and which the repo already uses this way | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` over the changed files | two hits, both English prose (`'…larger than any room'` in a test title, `'Use for any form.'` in a blueprint annotation); zero type positions | PASS |
| B06 | Type assertions limited to `as const` / `as unknown` | `grep -nE '\bas [A-Z]'` over the changed files | `none found`; JSON decoding lands on `const storedValue: unknown = JSON.parse(raw);` then `availableSupportSchema.parse(storedValue)` (`bars.repository.ts:16-17`) | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read every indexed access in the diff | `rows[0]?.body ?? null` (`outreach.repository.ts:14`), `const [row] = …; if (row === undefined) throw` (`:24`), `const named = address[key]; if (named !== undefined)` (`bar-search.core.ts:41-42`), same shape for `extratags[key]` | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` over the changed `.ts`/`.tsx` | `none` — the debounce runs through `useMemo` + an event handler (`BarPlaceSearch.tsx:32-40`), server state through TanStack Query, and the template editor resets via `key={template}` rather than an effect | PASS |
| B09 | Server state in TanStack Query, no hand-rolled fetchers | read `outreach.queries.ts`, `bars.queries.ts`, `me.queries.ts` | all reads are `useQuery`, all writes `useMutation`; calls go through the `hc` client | PASS |
| B10 | Forms use `@tanstack/react-form` | `OutreachTemplateCard.tsx:26`, `ContactDetailsForm.tsx:28`, `BarForm.tsx` | `const form = useForm({ defaultValues: …, onSubmit: … })` in each | PASS |
| B11 | Atomic design buckets | new component paths | `molecules/BarQualificationFields.tsx`, `organisms/{BarPlaceSearch,OutreachTemplateCard,ContactDetailsForm}.tsx` — no flat or `shared/` folder | PASS |
| B12 | Controllers are dispatchers | `bars.controller.ts:26-30`, `outreach.controller.ts:11-17`, `me.controller.ts:39-47` | each handler validates, calls one service, shapes the response; no `.map`/`.filter` over domain data | PASS |
| B13 | ESLint clean on the changed files | `pnpm exec eslint <56 changed ts/tsx>` | exit 0, no diagnostics | PASS |
| B14 | Prettier clean on the changed files | `pnpm exec prettier --check <changed non-md/non-sql>` | `All matched files use Prettier code style!` | PASS |
| B15 | knip clean | `pnpm exec knip` | exit 0, configuration hints only (the four pre-existing `.css` notes) | PASS |
| B16 | Typecheck clean | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B17 | Blueprint annotations complete and index current | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | `Scanned 1140 source files: 160 blueprint(s), 1034 follower(s). Annotations are complete and the index is up to date.` | PASS |
| B18 | Convention baseline not regressed | `pnpm exec tsx scripts/standards/convention-drift.ts --check` | `No question gained a new answer.` | PASS |
| B19 | `@DependsOnExternal` cross-checked against the manifest | `pnpm exec tsx scripts/architecture/architecture-graph.ts --check` | ran clean; `openstreetmap-nominatim` and `browser-clipboard` are declared in `scripts/architecture/manifests/pragma.manifest.ts` and tagged in `bar-search.adapter.ts:2` / `clipboard.adapter.ts:6` | PASS |
| B20 | VOCABULARY updated for the new nouns | `apps/pragma/VOCABULARY.md` | new bullets for `ownerMemberId`, `concertMood`, `availableSupport`, a *place* paragraph, member `phone`/`email`, and an *Outreach template* section with its "not to be confused with" | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test` | 0 — `Test Files 17 passed (17) / Tests 112 passed (112)`, 111.7 s | PASS |
| C02 | @borso-app/pragma (core + coverage gate) | `pnpm run test:core` from `apps/pragma` | 0 — `Test Files 137 passed (137) / Tests 1427 passed (1427)`; `Statements 100% (2221/2221) Branches 100% (1076/1076) Functions 100% (578/578) Lines 100% (1900/1900)`, `perFile: true` | PASS |
| C03 | Gated pure files in the diff all have a sibling test | enumerated `*.core.ts` / `*.utils.ts` / `*.adapter.ts` touched | `bar-search.core.ts`→`bar-search.core.test.ts`, `bar-search.adapter.ts`→`…adapter.test.ts`, `bar-support.core.ts`→`…core.test.ts`, `outreach-message.core.ts`→`…core.test.ts`, `clipboard.adapter.ts`→`…adapter.test.ts`, `bar-form.core.ts` and `bars-page.core.ts` extended in their existing suites; all matched by the `core` project's include globs and all at 100% per-file | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Owner carried through create; cleared when the member is deleted, bar survives | `it('carries the owner through create and clears it when that member goes', …)` — `apps/pragma/api/src/bars/bars.controller.test.ts` | PASS |
| D02 | Only a member uuid is accepted as the owner | `it('accepts a member uuid as the owner and refuses anything else', …)` — `apps/pragma/api/src/bars/bars.schema.test.ts` | PASS |
| D03 | Owner name resolved for the list and the card; unowned and stale-owner cases | `describe('selectOwnerName')` → `it('names the member the bar points at')`, `it('has no name for a bar nobody owns')`, `it('has no name for an owner who is gone')` — `apps/pragma/site/src/routes/bars/bars-page.core.test.ts` | PASS |
| D04 | Owner projected onto the kanban card | `describe('buildKanbanCardsByStatus owner projection') → it('names the owner the caller resolves')` — `bars-page.core.test.ts` | PASS |
| D05 | Template renders the bar name and the member's contact details | `it('names the bar and signs with the member contact details', …)` and `it('replaces the bar placeholder everywhere it appears', …)` — `apps/pragma/site/src/routes/bars/outreach-message.core.test.ts` | PASS |
| D06 | A contact detail not filled in renders as a visible mark | `it('marks a contact detail the member has not filled in', …)` — `outreach-message.core.test.ts` | PASS |
| D07 | Default template used until one is saved | `describe('selectOutreachTemplate')` → `it('prefers the saved template')`, `it('falls back when nothing was ever saved')`, `it('falls back on an empty saved template')` — `outreach-message.core.test.ts` | PASS |
| D08 | Template is one application-wide row, overwritten on save, session-gated | `it('rejects a read without a session cookie')`, `it('has no template until the band writes one, then serves what it saved')`, `it('overwrites the single template row rather than adding a second one')`, `it('refuses an empty template')` — `apps/pragma/api/src/outreach/outreach.controller.test.ts` | PASS |
| D09 | A refused clipboard is answered, not thrown | `it('reports a refused clipboard rather than throwing', …)` and `it('writes the text and reports the write happened', …)` — `apps/pragma/site/src/lib/clipboard.adapter.test.ts` | PASS |
| D10 | Place payload mapped to the fields a bar needs; city key fallback chain; phone tag fallback | `it('reads the fields a bar record needs out of a place')`, `it('walks the city keys OpenStreetMap uses, in order')`, `it('prefers the city over the other keys when several are present')`, `it('falls back to the contact phone tag, then to no phone')` — `apps/pragma/api/src/bars/bar-search.core.test.ts` | PASS |
| D11 | A field the place does not carry is left empty, never guessed | `it('has no city when the place carries no address, or none naming one')` — `bar-search.core.test.ts`; `it('leaves a field the place does not know empty')` — `apps/pragma/site/src/routes/bars/bar-form.core.test.ts` | PASS |
| D12 | An unexpected body yields an empty list rather than an error | `it('answers an empty list for an empty or unexpected body', …)` and `it('drops a place with no name rather than offering a blank row', …)` — `bar-search.core.test.ts` | PASS |
| D13 | One-per-second spacing and the hour of caching the usage policy requires | `it('serves a repeated query from the cache, which the usage policy requires')`, `it('keys the cache on the lowercased query')`, `it('asks again once the cached answer has expired')`, `it('spaces two different queries by the second the usage policy asks for')`, `it('calls straight away once the last call is a full second old')` — `apps/pragma/api/src/bars/bar-search.adapter.test.ts` | PASS |
| D14 | Picking a result always prepares a new bar, never an edit | `it('always builds a new bar, never an edit of the one on screen', …)` and `it('fills a blank form with what the place knows', …)` — `bar-form.core.test.ts` | PASS |
| D15 | The search route sits behind the member session | (none found) — `apps/pragma/api/src/bars/bars.controller.test.ts` has no `/search` case, and no back-e2e test pins the 401 the way every other bars route has one | **FAIL** |
| D16 | A search the service does not answer is reported as unreachable | (none found) — `it('ignores the body of a call the service refused')` pins that a non-OK response yields `[]`, which is the behaviour A20 flags as wrong; no test asserts the caller can tell a refusal from an empty result | **FAIL** |
| D17 | Mood: every value the column may hold, and null/unknown as not judged yet | `describe('resolveConcertMood')` → `it('names every mood the column may hold')`, `it('reads a null or unknown mood as not known yet')` — `apps/pragma/api/src/bars/bar-support.core.test.ts` | PASS |
| D18 | Support: canonical order, no duplicates, empty default | `describe('orderAvailableSupport')` → `it('reads back in the declared order, whatever order it was given')`, `it('keeps each support once')`, `it('keeps every support the bar lends')`, `it('answers an empty list for a bar that lends nothing')` — `bar-support.core.test.ts` | PASS |
| D19 | Mood and support round-trip through the API; a support outside the three is refused | `it('keeps the mood and the support a bar was qualified with')` and `it('rejects a support the band does not name')` — `bars.controller.test.ts` | PASS |
| D20 | A bar nobody qualified defaults to no mood and no support | `it('defaults a bar nobody qualified to no mood and no support', …)` — `bars.controller.test.ts` | PASS |
| D21 | The form's mood select and support checkboxes behave as a single and a multiple choice | `describe('toggleSupport')` → `it('adds a support the bar did not lend')`, `it('removes one it already lent')`, `it('keeps the declared order whatever the order of the clicks')`; `describe('parseConcertMood')` → `it('reads every mood the select offers')`, `it('reads the empty choice as no mood yet')`, `it('refuses a value the select never offered')` — `bar-form.core.test.ts` | PASS |
| D22 | The mood label reaches the card through the page, keeping the projection pure | `describe('addMoodLabelToCards')` → `it('labels the mood through the caller, which owns the translations')`, `it('leaves a bar whose mood is not known yet unlabelled')`, `it('gives every status a column, including the empty ones')` — `bars-page.core.test.ts` | PASS |

## Notes

- **A16 — the search card names Google Maps.** The spec's *Adding a bar from the map*
  decision is *"a search box backed by OpenStreetMap's Nominatim service"*, and the
  branch ships ADR-0017 (*"Nominatim answers the bar search"*) to record choosing it
  over Google. But `bars.searchTitle` reads `"Find a bar on Google Maps"` in `en.json`
  and `"Chercher un bar sur Google Maps"` in `fr.json:77` — the heading a member reads
  above the card names the vendor the ADR rejected. It is a leftover from commit
  `7bf4a70` (*"feat(pragma): add a bar from a Google Places search"*), which commit
  `12605f0` replaced with Nominatim without updating the two catalogue entries.
  Beyond being wrong, it works against the attribution requirement A17 satisfies: the
  card simultaneously credits OpenStreetMap contributors and announces Google Maps.
  Fix is two strings.
- **A20 / D16 — a refused search is reported as "no result".** The spec's last rule for
  the map feature is *"A search the service does not answer says so in one sentence"*,
  and `BarPlaceSearch.tsx` has that sentence (`bars.searchFailed`, rendered in a
  `role="alert"` at `:64-68`). It is unreachable for the case it was written for.
  `bar-search.adapter.ts:78` swallows every non-OK Nominatim response into an empty
  list, so a 429 (which the usage policy makes the likeliest failure), a 5xx or a
  maintenance page all arrive at the component as a successful query with zero hits,
  and the page renders `t('bars.searchNoResult')` — *"No place matched that search."*
  Only a thrown `fetch` or a 5xx from this application's own API reaches the error
  branch. The adapter's own test, `it('ignores the body of a call the service
  refused')`, pins the current behaviour rather than the spec's. Fix is to distinguish
  the refusal at the adapter boundary (throw, or return a discriminated outcome) and
  let the controller answer a status the query surfaces as an error.
- **D15 — the search route's session gate is untested.** `bars.controller.ts:21`
  applies `requireMemberSession` to `'*'`, so the route is in fact protected, and the
  route ordering against `/:id` is correct. But the spec makes the session an explicit
  rule (*"behind the same session as every other bars route"*), every sibling slice
  pins its 401 in back-e2e (`outreach.controller.test.ts` opens with exactly that
  test), and this route has none. It is also the one route whose protection could
  regress silently, because a future `/search` registered above the `.use` would still
  pass every other test in the file. One back-e2e case asserting 401 without a cookie.
- Prettier cannot infer a parser for the three `.sql` migrations; that is an artefact of
  invoking it over the raw changed-file list rather than through the pre-commit filter,
  not a finding about the branch. The non-SQL set passes.

## Verdict: FAIL
