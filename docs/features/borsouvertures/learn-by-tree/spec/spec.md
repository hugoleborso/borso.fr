# Learn an opening as a tree, drill it, then play it

<!-- Perspective passes (single-developer repo, Hugo wears all hats):
- client/business: implicit — the clan IS the client; "out of scope" decisions Q4, Q6 reflect this
- product: confronted via Q1 (mode primacy), Q2 (variation shape), Q5 (persistence)
- tech-lead: confronted via Q9 (race-fix shape), Q3 (commentary data path), the Changes section
- designer: confronted via Q7 (mobile-first), Q8 (tree visualization), Q10 (banner vs modal)
- developer: confronted via the Changes section (file-by-file shape, coverage gates, machine
  testing strategy)
-->

## Why

The Borso clan (audience: the few of us, no public surface) wants to **grow a small chess-opening
repertoire** by learning new variations and then drilling them until they can play them
flawlessly. Lichess Studies and Chess.com book mode work, but they require login, surface ads, and
break offline; the imported borsouvertures app removes that friction but in its current shape only
drills *single lines*, which doesn't match how someone actually adds a variation to their
repertoire (a variation is a *tree* of book moves, not a single sequence).

**Output metric (lagging, real-world, *not* asserted by `/visual-validation`):** clan members
have added a new variation to their personal repertoire after a single ~15-minute session.
Measured out-of-band by self-report — *"yes, I can play this now"* — when Hugo asks at family
dinner. Quarterly check, no instrumentation.

**Input metric (leading, machine-observable, asserted by `/visual-validation`):** in a single
browser session the validator can (a) pick any variation in the dataset, (b) drill the
Learn-tree until the *Variation cleared* banner appears, (c) tap *Switch to Play with this
scope*, (d) play every leaf line of that variation in Play mode without the app ever surfacing
an *Out-of-book* state. PASS on this assertion is the merge gate.

(See [`docs/knowledge/input-vs-output-metrics.md`](../../../../knowledge/input-vs-output-metrics.md)
for the framing — visual-validation drives input metrics only; the output metric is a proxy
humans review periodically, not a CI gate.)

Field observation (Gemba): Hugo currently uses Lichess Studies for this loop on a phone, hits
ads + login screen + slow chessboard, gives up.

## Result

The visible result for v1 is a **Learn-as-tree** view inside the existing app shell:

- Picking a *variation* (not a specific line) in the selector enters a "tree drill": the board
  shows the position at the variation's entry point, the panel shows every book move that exists
  in any line under this variation at the current ply, the user picks one, and the opponent
  random-picks one of *its* book replies. The drill ends when the user has been down each book
  branch at least once.
- Optional commentary panel reads from `site/openings/commentary/<opening-id>.yml` (sidecar). If
  the file is absent the panel is hidden — no empty-state ceremony.
- Play mode (free-play within a multi-selected scope) stays first-class for graduates of the
  Learn flow. Bugs in Play that block multi-select scope are in scope for fixing here; deeper
  Play-mode redesign is a later iteration.

The imported single-line Learn is **replaced**. The line-as-leaf is still drillable through the
tree (pick the variation, the tree degenerates to a stick).

## Use cases / edge cases

```
Happy path (Learn-as-tree):

1. User opens app → selector view. Desktop shows three columns (Openings / Variations / Lines)
   side-by-side; mobile shows one column at a time with a step indicator and Back button.
2. User picks a single Opening + a single Variation; the Lines column is left untouched (no
   specific line means "drill the whole variation tree"). The Start button reads
   "Drill this variation".
3. User taps Start. Board orients to the user's chosen side; if the user is Black, the
   `learnTreeMachine` plays the variation's mainline first move for White before yielding
   control.
4. Each ply: the app surfaces every distinct book move at this position (collected across every
   line in the variation that still matches the played prefix). The user picks one — via a
   board arrow or a labelled button in the panel below, depending on the visualization toggle
   (Q8).
5. Opponent random-picks from the book moves available at the new position. The machine
   advances; the user is back on move.
6. Loop until: (a) every leaf line in the variation has been visited at least once during the
   session [variation cleared], or (b) the user goes out of book [machine reverts the move and
   reveals book arrows for the current position].
7. On variation cleared, an inline banner appears above the board (not a modal) with a primary
   "Switch to Play with this scope" button and a secondary "Drill again" link. The board
   stays interactive for a victory lap.

Edge cases:

- User selects multiple variations → tree drill collapses each variation as siblings; clearing
  requires hitting every leaf across the whole multi-selection.
- User picks Black side → opening's first ply is auto-played by the app on Start. Currently
  broken in Play mode (B1 below); the new `playMachine` makes this parity-with-Learn the test.
- Commentary file missing → commentary panel hidden, no broken layout.
- Service worker cache stale (openings.json updated) → loadOpenings prefers network, falls
  back to bundled if offline; the bundled JSON is tagged with OPENINGS_CACHE_VERSION so a fresh
  build invalidates the workbox cache.

Error cases:

- openings.json malformed (JSON shape drift) → parseOpenings throws, the bundled fallback also
  throws, the app shows "Couldn't load openings — try refreshing" with a single retry button.
- Selector chooses a variation with zero lines (data-quality issue from the build script) →
  the variation is omitted from the selector entirely.
```

## Questions, options, decisions

1. **Mode primacy.** Decided: *Learn first, Play after*. Both modes are first-class. Play stays in
   the codebase; bugs that block multi-select scope are fixed in this iteration, deeper Play
   redesign is a later spec.
2. **Variation shape.** Decided: *tree explorer with random-picking opponent*. Rejected single-line
   drill (current), one-step-deeper drill (too close to today), pure spaced-repetition (deferred —
   needs persistence we don't have yet).
3. **Commentary.** Decided: *sidecar YAML files at `site/openings/commentary/<opening-id>.yml`*,
   panel hidden if absent. Not gated on data availability. Stretch slot — ship without it if
   unwritten. Background research:
   - The current source (`lichess-org/chess-openings`) ships move-sequences only. No commentary.
   - Off-the-shelf annotated datasets (`ecrucru/pgn-openings`, PGNMentor, Lumbras) are either
     license-incompatible (AGPL) or annotate *games*, not opening theory.
   - **Lichess Studies API** does carry comments (`/api/study/{id}.pgn?comments=true&variations=true`),
     and user-generated content is CC-BY-SA — redistributable with attribution. v1 ships a
     **stretch importer** at `scripts/import-lichess-study.ts` that takes a curated allow-list
     of study IDs (in `scripts/lichess-studies.allowlist.json`) and merges parsed `{ comments }`
     into the matching opening / variation. The importer is opt-in: the build doesn't depend on
     a network call to Lichess; the artefact is committed.
   - Wikibooks Chess Opening Theory (CC-BY-SA per-paragraph prose) is deferred — scraping is
     fragile and per-page attribution complicates the repo's commit story.
4. **Spaced repetition.** Out of scope for v1 (needs per-position persistence; clan-only audience
   doesn't justify the storage / sync complexity yet). Re-spec later.
5. **Persistence between sessions.** Decided: *localStorage on the device*. The store keeps last
   selection (opening / variation / side / theme), and the set of leaves visited per variation
   during the current drill. Survives reload, doesn't sync across devices. No DSQL, no auth.
   Schema: `borsouvertures.v1` namespace; future schema bumps key as `borsouvertures.v2` and the
   v1 entry is dropped — no in-place migration logic for a clan-only app.
6. **Auth / shareable links / leaderboards.** Out of scope. Clan-only. Anyone with the URL can
   use it; that's the whole story.
7. **Device weighting.** Decided: *mobile-first*. Hugo's primary surface is iPhone on the couch.
   Visual-validation runs against a 380×800 viewport in addition to the desktop viewport; tap
   targets are sized for thumbs (≥44 px); the tree-of-moves UI must be reachable without
   pinch-zoom. The existing `useIsMobile` breakpoint at 900 px stands.
8. **Tree visualization.** Decided: *both shapes, with a user toggle*. The board overlays
   colored arrows for every distinct book move at the current ply (today's `showMoves` arrows,
   re-purposed), AND a labelled list of move buttons appears in the panel below the board
   (`7. Bb5  Ruy Lopez`, `7. Bc4  Italian`). Mobile defaults to the button list (arrows pile up
   on a small board); desktop defaults to arrows. The toggle lives in the in-session controls
   row, persists to localStorage.
9. **Race-condition fix shape (B5).** Decided: *external state machine*. Pull the opponent-move
   loop out of the React components into a small machine in
   `site/openings/learnTreeMachine.utils.ts` (and a sibling `playMachine.utils.ts` for Play). The
   machine carries a generation counter; stale `setTimeout` callbacks check the generation and
   bail. Components subscribe via `useSyncExternalStore`. The machine is tested directly by
   vitest with no DOM, gated at 100% coverage. This also kills the `// biome-ignore
   useExhaustiveDependencies` suppressions inside the modes — they exist today only because the
   loop is component-local.
10. **Variation-cleared celebration.** Decided: *inline banner above the board*, not a modal.
    The banner reads `Variation cleared — every line visited at least once`, with two affordances:
    a primary `Switch to Play with this scope` button and a secondary `Drill again` link that
    resets the visited-leaves set. No modal interruption; the user can keep playing the line if
    they want a victory lap.

## Bug list inherited from the imported app (in scope to fix)

These are observed in the just-merged port. Each row is a defect the v1 spec must address (fix
or explicitly defer with rationale).

| # | Symptom                                                                 | Mode  | Fix in v1? |
| - | ----------------------------------------------------------------------- | ----- | ---------- |
| B1 | Picking Black, opponent doesn't auto-play White's first move            | Play  | Yes (parity with Learn) |
| B2 | "Show Book Moves" arrows wiped on first piece-touch even before move    | Play  | Yes |
| ~~B3~~ | ~~Multi-select drift~~ — demoted from bug list. The back-fill keeps `gatherCandidates`'s AND-filtered scope coherent with what the pills show; without it, scoping a line under opening A then a line under opening B would silently exclude one of them. Tracked as a UX clarity follow-up, not a v1 fix. | — | No |
| B4 | Empty scope (everything deselected) still renders board + accepts moves  | Play  | Yes (block Start, surface "pick something") |
| B5 | setTimeout from previous line/side fires after a switch                  | Both  | Yes — Q9 external state machine + generation counter |
| B6 | Reset / Undo: book arrows go stale after the user requests them and then resets | Play | Yes — the state machine derives arrows from current ply; `manualArrows` flag deleted |
| B7 | Selector visible before openings.json arrives (no skeleton)              | Both  | Yes (gate selector behind `loading`) |

## Changes

- **Domain model.** `Opening { id, name, ecoCodes, variations: Variation[] }` →
  `Variation { id, name, lines: Line[], commentary?: string }` →
  `Line { id, name, eco, movesSan, movesUci }` is unchanged. New conceptual entity:
  `BookTree` — derived (not stored), produced from a `Variation`'s lines as the set of distinct
  next-moves at each ply prefix. Lives in `site/openings/bookTree.utils.ts`.
- **New files** (NEW):
  - `site/openings/bookTree.utils.ts` + sibling `.test.ts` (pure: derives the set of distinct
    next-moves at each ply prefix from a `Variation`'s lines; 100% coverage gated).
  - `site/openings/commentary.utils.ts` + sibling `.test.ts` (loader for sidecar YAML; pure).
  - `site/openings/commentary/<opening-id>.yml` (data, opt-in, hand-written; absent → panel
    hidden).
  - `site/openings/learnTreeMachine.utils.ts` + sibling `.test.ts` (the Learn-tree state
    machine: visited-leaves set, generation counter for stale-`setTimeout` rejection,
    drill-complete predicate, dispatchers for `playMove` / `requestOpponentMove` / `reset` /
    `revealBookMoves`. Subscribe-able via `useSyncExternalStore`.)
  - `site/openings/playMachine.utils.ts` + sibling `.test.ts` (the Play-mode counterpart with
    its own generation counter; same shape as learnTreeMachine).
  - `site/state/localStorage.utils.ts` + sibling `.test.ts` (typed read / write of the
    `borsouvertures.v1` namespace; schema bumps drop, never migrate).
  - `site/modes/ModeLearnTree.tsx` (the new tree-drill view; consumes `learnTreeMachine`).
  - `site/components/InlineBanner.tsx` (variation-cleared banner — small, no a11y dialog
    machinery, just a panel with a CTA).
  - `site/components/MoveButtonList.tsx` (the alternative-to-arrows tree visualization, the
    mobile default).
  - `scripts/import-lichess-study.ts` + `scripts/lichess-studies.allowlist.json` (stretch
    importer; pulls comments from a curated allow-list and merges into commentary YAMLs).
- **Updated files** (UPDATE):
  - `site/modes/ModePlay.tsx` — consume `playMachine` instead of owning the loop; fixes B1
    (machine plays White's first move when side=Black on Start), B2 (arrows are derived
    state, not eagerly cleared in the move handler), B4 (machine refuses Start with empty
    scope), B5 (generation counter), B6 (arrow recomputation is a machine-state derivation).
  - `site/state/useAppState.ts` — extend the Zustand store to read / write the localStorage
    `borsouvertures.v1` namespace (last selection, side, theme, treeVisualizationMode).
  - `site/App.tsx` — gate the selector behind `loading`, fixes B7. Replace
    `ModeLearn` import with `ModeLearnTree`. Wire the inline banner.
  - `site/openings/loadOpenings.ts` — surface a hard error UI path when both fetch + bundled
    fail (today it console.warns and returns empty; the new path renders an error panel with
    a single "Reload" button).
  - `site/openings/types.ts` — add optional `commentary?: string` to `Opening` and
    `Variation`. Backwards-compatible with the existing `openings.json`.
- **Test strategy.** Autonomous, no manual sweep:
  - Pure helpers and state machines (`bookTree.utils.ts`, `commentary.utils.ts`,
    `learnTreeMachine.utils.ts`, `playMachine.utils.ts`, `localStorage.utils.ts`,
    `bookEngine.utils.ts`) at 100% coverage via vitest, gated by the existing config. The
    machines are driven directly by the test runner — no React render — exercising `playMove`
    / `requestOpponentMove` / `reset` against fixture variations.
  - `/visual-validation` against this spec: each numbered happy-path step + each edge-case
    bullet becomes one assertion row that the visual-validator drives in a real browser.
  - Bug-list rows B1–B7 become explicit visual-validation assertions, each with a "before"
    repro that fails on the imported port and a "after" green check on the fix.

## Production strategy

### Analytics

**Input metrics** (the leading behaviours we expect a clan member to perform; CI-gated via
visual-validation, not via runtime telemetry):

- *Variation drilled to completion* — every leaf in the chosen variation visited in a single
  Learn-tree session.
- *Switch-to-Play tap* — banner CTA pressed within the same session.
- *Play scope reaches every leaf without OOB* — every leaf playable in Play mode without an
  out-of-book event.

These are NOT instrumented as runtime events. Five users; the visual-validator proves the
flow works, the absence of bug reports proves it keeps working. If usage grows past the clan
we re-spec to add real telemetry.

**Output metric** (lagging, out-of-band, manual): Hugo asks at family dinner whether the
person can now play that variation. Quarterly review of "did the Learn-tree drill actually
land?" If the answer trends to "no", the *input metrics still pass but the output stalls* —
that's the signal to re-spec the Learn flow (e.g. add spaced repetition).

### Zero-defect strategy

No Sentry, no alerting infrastructure for v1. The CI gates (lint / typecheck / 100% utils
coverage / `/visual-validation` against the input-metric assertion above + the bug-list
assertions B1–B7) are the safety net. If a bug lands in clan-prod, Hugo files a `/dantotsu`
and the eradication ships in the same week.
