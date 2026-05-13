# Les douze travaux — page publique de suivi des défis mensuels

## Perspectives confronted

- [x] **Client / business** — Audience confirmed: friends / people who already know Hugo. Not strangers from a CV surface, not purely a personal scoreboard. Editorial feel matters; fictional content is unacceptable (friends would catch it).
- [x] **Product** — Core job-to-be-done: scan all 12 months at a glance, drill in on click. The v0's filmstrip + featured-month + year switcher structure earns its place. Out of scope: live edit mode, comments, social features.
- [x] **Tech-lead** — Page reads real `new Date()` for the "current month" dot and the default featured month. No build-time freeze, no URL override. Visual-validation skips clock-sensitive assertions in exchange (see Test strategy).
- [x] **Developer** — Full `/visual-validation` + `/technical-validation` pipeline. No relaxed test policy for being a personal page. Test surface enumerated in *Test strategy* below.
- [x] **Designer** — User confirmed the v0 visual direction (magazine direction-C from the Claude Design export) is good as-is. Visible result = the layout currently on branch `claude/implement-design-file-U1rFg`. No further UI questions.

## Why

A friend who already knows Hugo lands on `borso.fr/12-travaux/` and immediately sees what he's been up to all year — twelve self-imposed monthly challenges, what's done, what's in flight, what's coming. The page is something Hugo sends in DMs (*"voilà ce que je fais en ce moment"*) and something a friend can scroll through in 60 seconds without context.

**Measurable objective.** A friend opening the page can name (a) the current month's challenges, (b) the year-to-date completion ratio, and (c) the next upcoming defi, in under 60 seconds, without scrolling-fatigue. This is the user-comprehension objective; success means the page doesn't get explained over chat afterwards.

**Gemba.** The current state (until this branch lands) is the Rickroll on the homepage nav under *"Les 12 travaux de Borso"* — i.e. nothing. Friends asking *"alors c'est quoi tes douze travaux cette année ?"* get a screenshot-of-Notes-app reply. That's the problem this page replaces.

## Result

The Claude Design export lives at [`./design-export/`](./design-export/) and the picked direction is [`./design-export/project/direction-c.jsx`](./design-export/project/direction-c.jsx) (Magazine — *Frise éditoriale*). The v0 React port is on branch `claude/implement-design-file-U1rFg` under `apps/borso-fr/site/12-travaux/`.

Visible result, top to bottom:
1. **Masthead** — `borso.fr` link (back to home) + year switcher (one button per year present in `data.ts`).
2. **Title block** — *"Les douze travaux."* (Instrument Serif italic, accent dot) + project tagline.
3. **Hero year** — current year as a 220px numeral, year title/subtitle, year-progress bar, 3 mini-stats (quotidiens / ponctuels / restants).
4. **Featured month** — striped image slot + month name as a 108px numeral + per-challenge rows (numbered, with status tag, kind label, optional note, optional proof chips).
5. **Filmstrip** — 12 cards in one row, one per month. Click → focus that month above. Active card inverts. Current month carries a saffron dot.
6. **Footer rule** — minimal "borso.fr · les 12 travaux" line.

## Use cases / edge cases

> *Phrasing matters: `/visual-validation` builds its assertion checklist from this section. Each numbered or bulleted line below should be checkable from a single browser session.*

### Happy path
1. Friend opens `borso.fr` (homepage), clicks the nav menu, clicks **"Les 12 travaux de Borso"** → lands on `/12-travaux/`. The link no longer points to the Rickroll.
2. Page renders with the current year selected (latest year present in `data.ts`).
3. Featured month panel shows the current month's challenges if the current year is selected, otherwise month 1 of the selected year.
4. Friend clicks year `2025` in the masthead → year switches, featured panel resets to January 2025, hero updates.
5. Friend clicks month `Mars` in the filmstrip → featured panel re-renders with March's challenges; the March card inverts (dark fill).
6. Friend clicks back on the current year → featured panel shows the current month (clock-dependent; same `pickDefaultMonth` rule as initial load).
7. Friend clicks the `borso.fr` masthead link → returns to homepage.

### Edge cases
- A month with **zero challenges** renders as an empty card in the filmstrip (no bars, score `0/0`). Featured panel for that month shows the month name + "0 sur 0 aboutis" and an empty challenges list.
- A challenge **without a note** renders only the title + status tag + kind label. No empty "« »" quote.
- A challenge **without proofs** renders no proof-chip row. The component doesn't ship an empty container.
- A challenge with `status: 'doing'` is the only status that renders with a *filled* saffron background tag. All other statuses render bordered-only.
- On a viewport `<= 760px`, the filmstrip scrolls horizontally (`overflow-x: auto`), each card has a 160px minimum width. Hero, featured panel, and masthead-title collapse to a single column.
- On a viewport `<= 900px`, hero year font drops to 140px, title font drops to 96px (preventing overflow).
- If `today` falls inside a year **not present** in `data.ts`, the page renders with the **latest available year** selected (no crash). The current-month dot does not appear.

### Error cases
- `data.ts` corrupted / missing → build fails at typecheck. No runtime error path.
- A non-existent month is somehow selected → the component falls back to `months[0]`; if `months` is empty, throws at render time (acceptable: data.ts is curated, this would be a code bug).

## Questions, Options and Decisions

| Question | Options | Decision (date) |
| --- | --- | --- |
| What's the audience for this page? | Self / friends / strangers / mix | **Friends** (2026-05-11). Editorial feel + truthful content. |
| What's the core interaction? | All-12-at-a-glance with drill-in / list / current-only / static spread | **Filmstrip + drill-in** (2026-05-11). |
| What to do with the AI-fabricated `note` and `proofs` fields from the design export? | Keep / strip / let user fill via PR / collect real data now | **Collect real data now** (2026-05-11) — Hugo provides notes/stats/completion for every defi via `data-input.md`. Schema stays. |
| What status does an unspecified 2025 challenge default to? | All `done` / all `todo` / ask user | Resolved by previous row: user provides real statuses. v0's `all done` is provisional and gets overwritten. |
| How does the page resolve "today"? | `new Date()` / URL override / build-time constant / hard-coded | **Real `new Date()`** (2026-05-11). Validator skips clock-sensitive assertions. |
| What tests earn their place? | Utils-only / utils + visual-validation / playwright component / snapshot | **Full `/visual-validation` + `/technical-validation`** (2026-05-11). |
| Should the design's "+ ajouter une preuve" button stay? | Keep / drop | **Dropped** (already in v0) — chat transcript says no backend; the button is dead UI. |
| Should the design's "chronique mensuelle · n° X" + "Reprise de la mesure le 1er de chaque mois." chrome stay? | Keep / drop | **Dropped** (already in v0) — overwrought magazine framing the user flagged as cringe. |
| Year-switch behaviour: which month is featured after switching? | Always month 1 / current-month-if-switching-to-current-year / preserve selected | **current-month-if-switching-to-current-year, else month 1** (2026-05-11). Matches v0 `pickDefaultMonth(year)`. Clock-dependent → visual-validation only asserts the *non-current-year* branch. |
| Should the magazine-style striped image slots be replaced with real photos? | Replace now / keep placeholders / drop image slots entirely | **Keep placeholders** for this iteration. Real photos arrive through the `proofs: [{ type: 'photo', v: ... }]` schema, not as hero images. |

**Out of scope:**
- Live edit mode (no "+ add proof" button, no admin UI).
- Comments / social / sharing buttons.
- Backend / database. Data lives in `data.ts`, edited via PR.
- Photo hosting. `proof.v` for photos is a filename reference; the asset pipeline / hosting is a separate concern, deferred until Hugo actually has photos to host.
- Multi-language. Page is French-only.
- Mobile-first redesign. Responsive tweaks land for `<= 900px` and `<= 760px`; below that, content scrolls.
- Analytics (see Production strategy).

## Changes

### Types / domain model

```ts
type ChallengeStatus = 'done' | 'partial' | 'failed' | 'abandoned' | 'doing' | 'todo';
type ChallengeKind = 'daily' | 'count' | 'oneshot';
type ProofType = 'photo' | 'video' | 'link' | 'note' | 'stat';

type Proof = { type: ProofType; v: string; label?: string };
type Challenge = {
  t: string;
  kind: ChallengeKind;
  status: ChallengeStatus;
  note?: string;
  proofs?: Proof[];
};
type Month = { m: number; name: string; challenges: Challenge[] };
type Year = { title: string; subtitle: string; months: Month[] };
type Data = { years: Record<number, Year> };
```

Schema as in the v0. Real content is collected from Hugo through [`./data-input.md`](./data-input.md) (generated alongside this spec) and merged into `apps/borso-fr/site/12-travaux/data.ts`.

### Database changes

None. Data lives in `data.ts`.

### Files to change

```
apps/borso-fr/site/12-travaux/index.html                  // KEEP from v0
apps/borso-fr/site/12-travaux/main.tsx                    // KEEP
apps/borso-fr/site/12-travaux/App.tsx                     // KEEP
apps/borso-fr/site/12-travaux/components.tsx              // KEEP
apps/borso-fr/site/12-travaux/featured-month.tsx          // KEEP
apps/borso-fr/site/12-travaux/filmstrip-card.tsx          // KEEP
apps/borso-fr/site/12-travaux/styles.css                  // KEEP
apps/borso-fr/site/12-travaux/theme.ts                    // KEEP
apps/borso-fr/site/12-travaux/data.ts                     // UPDATE: replace v0 statuses + populate notes/proofs from data-input.md
apps/borso-fr/site/12-travaux/data.utils.ts               // KEEP (already 100% covered)
apps/borso-fr/site/12-travaux/data.utils.test.ts          // KEEP
apps/borso-fr/site/index.html                             // KEEP (nav link already points to /12-travaux/)
apps/borso-fr/vite.config.ts                              // KEEP (entry already registered)
knip.json                                                 // KEEP (entry already registered)
docs/features/borso-fr/12-travaux/spec/data-input.md      // NEW — fill-in template for Hugo
```

### Test strategy

The validation pipeline must be **autonomous**. Two layers:

**1. Unit tests on pure utilities** — already in place at 100% coverage:
- `data.utils.test.ts` covers `monthScore`, `yearScore`, `formatScore`, `statusLabel`, `statusColorRole`, `kindLabel`, `filmstripBarColor`, `proofIcon`, `countChallenges`.
- Gate stays at 100% statement / branch / function / line coverage (CLAUDE.md *Clean code*).

**2. `/visual-validation`** — drives the running app in a real browser (agent-browser CLI). Boots `pnpm --filter @borso-app/borso-fr dev`, opens `http://localhost:5173/12-travaux/`, and walks the assertion list built from *Use cases / edge cases* above. Specifically asserts:
- Page renders without console errors.
- Masthead `borso.fr` link points to `/`.
- Year switcher has one button per year in `data.ts`; clicking a **non-current** year inverts that button and resets the featured panel to **month 1** of the new year (deterministic; clicking the current year is clock-dependent and skipped).
- Clicking a filmstrip card inverts that card (dark fill) and re-renders the featured panel to that month.
- A `doing`-status challenge renders with a saffron fill on its status tag; all others render bordered-only.
- A challenge without a `note` renders no `«` quote character in its DOM subtree.
- A challenge without `proofs` renders no proof-chip container.
- At `<= 760px` viewport, the filmstrip's computed `grid-template-columns` produces 12 columns ≥ 160px each (i.e. the row scrolls).
- Homepage `/`'s "Les 12 travaux de Borso" nav link href is `12-travaux/` (NOT the Rickroll URL).

**Clock-sensitive assertions** (current-month dot, default-featured-month-on-initial-load, year-switch-to-current-year) are **explicitly excluded** from /visual-validation — per the tech-lead decision, the page reads `new Date()` and the validator can't pin a date. These behaviours are covered by code review during `/technical-validation`.

**3. `/technical-validation`** — runs against the diff: biome, knip, typecheck, build, vitest, plus a correctness pass on each Q.O.D. row against the code.

**Manual sweeps are not a fallback.** Hugo does not click through this page before merge.

## Production strategy

### Analytics

**None for this iteration.** This is a personal page on a static site behind CloudFront. No analytics SDK, no events, no PostHog/GA. If a defect ships, Hugo or a friend notices and opens an issue / PR.

This is explicitly called out (not omitted): the page is small enough and the audience tight enough that the cost of instrumentation isn't justified. The standard-template *"named events"* row is therefore N/A — and intentionally so.

### Zero-defect strategy

- **Build-time gates** are the alerting layer: any change that breaks typecheck / biome / knip / tests / build blocks the PR. The `pre-push` and `pre-commit` hooks (CLAUDE.md) catch this locally; CI catches it on PR.
- **`/visual-validation` in CI on every PR touching `apps/borso-fr/site/12-travaux/**`** — see Test strategy. A PR can't merge with a failed visual-validation report.
- **Post-deploy smoke** — once prod deploy completes (manually approved via GitHub Actions per CLAUDE.md), Hugo opens `https://borso.fr/12-travaux/` once and confirms it loads. This is a *belt* on top of the automated suspenders, not the test strategy.
- **No Sentry / runtime error capture** for this page in this iteration. If a runtime error ships and Hugo discovers it, the eradication ladder (CLAUDE.md *Self-improvement loop*) starts: dantotsu → countermeasure → code-level fix.
