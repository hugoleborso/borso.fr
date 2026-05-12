# Plan — Les douze travaux (borso-fr / 12-travaux)

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.
>
> **Status note.** A v0 of this page already exists on this branch — committed before the spec, retroactively backed by `spec.md`. The plan below treats the v0 as the *starting state*, names the gaps between v0 and spec (mainly: real data, validator wiring, deploy verification), and routes each gap to a code location.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Audience = friends; truthful content | AI-fabricated `note` and `proofs` fields stripped from v0; real values come from Hugo via [`../spec/data-input.md`](../spec/data-input.md) | `apps/borso-fr/site/12-travaux/data.ts` (UPDATE) — parse the filled `data-input.md` into typed entries; preserve schema for empty fields. | `grep -E "Compté la marche|m'étais menti|montage-journee" apps/borso-fr/site/12-travaux/data.ts` returns nothing |
| Product = filmstrip + drill-in | v0 layout (masthead, hero, featured month, filmstrip, footer) is correct as-is | `App.tsx`, `featured-month.tsx`, `filmstrip-card.tsx`, `components.tsx`, `theme.ts` — KEEP | Page renders the five visible blocks in the order listed in `spec.md → Result` |
| Tech-lead = real `new Date()`; validator skips clock | v0 already does this via `pickDefaultMonth(year)` and the `isCurrent` prop | `App.tsx` lines 15–19 (`pickDefaultMonth`), line 30 (`todayMonth`), `filmstrip-card.tsx` (`isCurrent` dot) — KEEP | grep for `pickDefaultMonth` in `App.tsx` returns one definition + two call sites; no env-var, no URL param, no hard-coded date |
| Designer = v0 UI is final | No design changes; Instrument Serif + Space Grotesk via Google Fonts CDN; striped image placeholders stay | `index.html` `<link>` tags; `theme.ts` colour palette; `ImageSlot` component — KEEP | DevTools network shows two requests to `fonts.googleapis.com`; no image-asset 404s |
| Q.O.D. — drop `+ ajouter une preuve` button | v0 already dropped it | `featured-month.tsx` — has no `<button>` for "ajouter une preuve" | grep `ajouter une preuve` under `apps/borso-fr/site/12-travaux/` returns nothing |
| Q.O.D. — drop "chronique mensuelle · n° X" and "Reprise de la mesure le 1er de chaque mois." | v0 already dropped them | `App.tsx` (masthead + footer) | grep `chronique mensuelle` / `Reprise de la mesure` under the page folder returns nothing |
| Q.O.D. — year-switch behaviour: `pickDefaultMonth(year)` | v0 already matches | `App.tsx:15–19` | Unit-test-shaped if the helper were pure; today it reads `new Date()` so it's untestable as a pure fn — covered by `/visual-validation` on the non-current-year branch only (see *Test strategy* in spec) |
| Test strategy = full `/visual-validation` + `/technical-validation` | All assertions enumerated in `spec.md → Use cases / edge cases`; data-utils tests already at 100% | `data.utils.test.ts` (KEEP); validation reports land at `../validation/visual-validation-<ts>.md` and `../validation/technical-validation-<ts>.md` | `pnpm test:coverage` shows 100/100/100/100 on `data.utils.ts`; both validation reports exist before merge |
| Production strategy = no analytics; build gates as alerting | No SDK, no events, no script tags beyond fonts | `index.html` has zero `<script>` tags pointing outside the site origin; `main.tsx` imports no analytics package | grep `analytics\|posthog\|plausible\|umami\|gtag` under `apps/borso-fr/site/12-travaux/` returns nothing |
| Homepage nav points to `/12-travaux/` | v0 already wired | `apps/borso-fr/site/index.html` line 30 | grep `dQw4w9WgXcQ` in homepage returns nothing; href is `12-travaux/` |
| Deploy: `/12-travaux/` URL resolves on CloudFront | The `cf-static-site-index-rewrite` function rewrites `/12-travaux/` → `/12-travaux/index.html` (already deployed for `/art/mondrian/` etc.) | `infra/cdk/src/internal/cf-static-site-index-rewrite.code.js` — no change required; the rewrite is path-agnostic | After prod deploy, `curl -sIL https://borso.fr/12-travaux/ | head -1` returns `HTTP/2 200` |

## Changes — pure-helper rule

| Module | Purity | Suffix required | Test required |
|---|---|---|---|
| `data.utils.ts` | pure | `*.utils.ts` ✓ | `data.utils.test.ts` at 100 % (exists) |
| `data.ts` | data-only (no behaviour) | no suffix required | none — it's a data module |
| `theme.ts` | constants only | no suffix required (no behaviour) | none |
| `App.tsx`, `components.tsx`, `featured-month.tsx`, `filmstrip-card.tsx` | side-effectful (React state, DOM events, `new Date()`) | no suffix | covered by `/visual-validation` |

No new utility modules introduced by this plan beyond what the v0 already has.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| `agent-browser` Chromium provision failed at session start (per SessionStart hook log) — `/visual-validation` may error before its first assertion | **high** | `/implementation` runs `npx playwright install chromium` (or `agent-browser` equivalent) before the first `/visual-validation`. If that still fails, surface the error to user and treat it as a blocker — the spec mandates full validation. | `/visual-validation` returns `FAIL` with "no browser" in the report; impl skill catches and re-runs after browser install |
| Real data not yet provided in `data-input.md` when implementation runs | medium | `/implementation` only parses `data-input.md` if it contains non-empty `status:` / `note:` / `proofs:` lines; if empty, v0 placeholder data stays. The page is shippable in either state. | `data.ts` diff is no-op if `data-input.md` is empty; PR description names this. |
| AI-fabricated 2025 statuses (all `done`) ship to prod because Hugo hasn't filled `data-input.md` yet | medium | Add a top-of-file comment in `data.ts` flagging "2025 statuses are provisional pending data-input.md". `/visual-validation` does not assert specific status values for 2025. | The provisional comment is greppable; absence from data.ts after data-input is parsed is a checkable signal |
| `noUncheckedIndexedAccess` runtime crash on `yearData.months.find(...)` returning undefined | medium | v0 already guards: `?? yearData.months[0]` and `if (!featured) throw`. Plan keeps both guards. | `pnpm typecheck` would flag a missing fallback; runtime guard ensures fail-fast |
| Biome `noImportantStyles` re-fires if responsive styles drift back into inline | medium | `styles.css` owns all responsive properties; `App.tsx`, `featured-month.tsx`, `filmstrip-card.tsx` never inline `gridTemplateColumns`, `fontSize`, or `padding` on elements that have a media-query override. | `grep "!important" apps/borso-fr/site/12-travaux/styles.css` returns nothing; `pnpm exec biome lint` passes |
| Biome `noUnnecessaryConditions` re-fires if a future helper switches on a union | medium | Pure helpers use typed `Record<Union, V> as const satisfies` lookup, not `switch`. Existing pattern in `data.utils.ts` (STATUS_LABEL, STATUS_COLOR_ROLE, KIND_LABEL, FILMSTRIP_BAR_COLOR_*, PROOF_ICON). | `pnpm exec biome lint` passes |
| Biome `noExcessiveLinesPerFile` re-fires if `App.tsx` grows | low | Page is already split into `App.tsx` + `components.tsx` + `featured-month.tsx` + `filmstrip-card.tsx` + `theme.ts`. New rows added during data-fill go to `data.ts`, not the components. | `wc -l` on each `.tsx` stays below the rule's threshold (currently all ≤ ~390 lines) |
| Knip flags new files under `docs/features/.../design-export/` as unused | low | Already fixed: `knip.json` has `"ignore": ["docs/**"]`. | `pnpm exec knip` passes on this branch (verified) |
| Visual-validation references assertions in the spec that mention specific months/statuses, but Hugo edits `data.ts` between report and merge → assertions go stale | medium | Assertions in the spec use **schema-level** language ("a `doing` challenge", "a challenge without `proofs`"), not content-level ("Backyard in Mai") — so they survive data churn. | `/visual-validation` report is regenerated after every `data.ts` change in this PR; report timestamp is newer than the latest `data.ts` mtime |
| CloudFront `/12-travaux/` URL fails because the static-site index-rewrite construct doesn't cover paths with digits/hyphens | low | The rewrite is path-agnostic (rewrites any path ending `/` to `/index.html`); same construct handles `/art/mondrian/`. | After deploy: `curl -sIL https://borso.fr/12-travaux/` returns 200 |
| Google Fonts CDN is slow / blocked → page renders without `Instrument Serif` and looks like Times | low | `font-display: swap` is the default for Google Fonts; system serif fallback is acceptable as a degraded state. Could be tightened later to self-hosted `@fontsource` if it ever becomes a real problem. | Lighthouse score; visual-validation does not assert specific font rendering |
| Visual-validation test environment differs from prod (dev server, no CloudFront rewrite) so assertions about masthead `borso.fr` link target `/` may behave differently | low | Both dev (Vite, `root: ./site`) and prod (CloudFront, alias root) serve homepage at `/`. The masthead `href="/"` is correct for both. | curl `/` and `/12-travaux/` in both envs return 200 |

## Code-quality self-check

- [x] Repo lint rules pass (`pnpm exec biome check` — verified on branch).
- [x] Type-assertion plugin satisfied: only `as const satisfies Record<…, …>` used in `data.utils.ts`. No `as Foo`, no `as unknown as Foo`.
- [x] No `any`.
- [x] No single-letter locals outside the `(a, b) => a - b` sort comparator. (Variable `y` in App.tsx's year-switch button has been renamed in v0 review — confirmed in current file; if not, rename in impl.)
- [x] Magic numbers / strings extracted: `DONE_WEIGHT`, `PARTIAL_WEIGHT`, `ACTIVE_INNER_BORDER`, palette constants in `theme.ts`, breakpoints in `styles.css`. Font sizes that have media-query variants live in `styles.css`, not inline.
- [x] Comments document the WHY only: `data.ts` schema comment block explains how to add proofs (non-obvious because of the abbreviated `t` / `v` field names). No what-comments anywhere.
- [x] No JSDoc on internals.
- [x] Function names describe the result, not the mechanism: `monthScore`, `yearScore`, `formatScore`, `statusLabel`, `kindLabel`, `proofIcon`, `pickDefaultMonth`, `roleColor`.

## Pre-flight gates (run, in order, before push)

1. `pnpm install` — no-op if clean (SessionStart hook already ran).
2. `pnpm --filter @borso-app/borso-fr typecheck` — TS clean (incl. CDK side: requires `pnpm --filter @borso/infra build` first per session-recurring workflow).
3. `pnpm --filter @borso-app/borso-fr test:coverage` — `data.utils.ts` at 100 % statements / branches / functions / lines.
4. `cd /home/user/borso.fr && pnpm exec biome check apps/borso-fr/site/12-travaux/ apps/borso-fr/site/index.html apps/borso-fr/vite.config.ts knip.json` — including the type-assertion plugin.
5. `pnpm --filter @borso-app/borso-fr build` — Vite multi-page build emits `dist/12-travaux/index.html` + `dist/assets/douzeTravaux-*.{js,css}`.
6. `pnpm exec knip` — passes (verified on branch; `docs/**` is ignored).
7. `/visual-validation docs/features/borso-fr/12-travaux/spec/spec.md` — verdict PASS or PASS_EXCEPT_UNVERIFIABLE (clock-sensitive assertions are explicitly unverifiable here). Report committed under `../validation/`.
8. `/technical-validation docs/features/borso-fr/12-travaux/spec/spec.md` — verdict PASS. Report committed under `../validation/`.

## Open questions / unknowns

- **When does Hugo fill `data-input.md`?** The plan handles both (empty → keep v0 placeholders; non-empty → parse and replace). But the *deploy approval* the user has to give after merge (per CLAUDE.md *Deployments*) is for whatever `data.ts` is at merge time. If `data-input.md` is filled *after* this branch merges, that's a follow-up PR — not a blocker for the current branch.
- **Photo hosting** for `proof.v: 'foo.jpg'` references. Out of scope per spec. Plan: leave references as filenames in `data.ts`; the v0 `ImageSlot` is a striped placeholder, not an `<img>`. When real photos arrive, they'll be added to `apps/borso-fr/site/public/12-travaux/` and the schema can grow a resolver in a follow-up. The current iteration does not need a resolver.
- **`/visual-validation` browser availability.** SessionStart said agent-browser's Chromium install failed. Mitigation is in the risk register; if it can't be resolved in-session, this becomes a blocker the user needs to unblock (run on another machine, or accept a `FAIL` for the browser-dependent assertions while keeping `/technical-validation` PASS).

## Missing technical skills

Seed these under `.claude/skills/` next pass (in order of marginal value to this repo):

- `/vite` — Vite multi-page configs are appearing across `apps/borso-fr/` and would benefit from a shared skill (multi-input rollup, `publicDir`, font self-hosting trade-offs, plugin-react quirks).
- `/react-island` — the borso-fr pattern of "static HTML site + React island per page" is now repeated twice (`/art/mondrian/`, `/12-travaux/`). A skill could codify the entry-point boilerplate, knip wiring, biome interaction.
- `/biome-types-without-assertion` — the `Record<Union, V> as const satisfies` pattern that satisfies both `noUnnecessaryConditions` and the type-assertion plugin is non-obvious; surfaced twice now (here and in mondrian). A skill could document it once.
- `/cloudfront-static-route` — every new page route is a tacit dependency on the `cf-static-site-index-rewrite` construct. A skill could enumerate the contract (path semantics, trailing slash, default doc) so plans like this one don't have to re-derive it.
