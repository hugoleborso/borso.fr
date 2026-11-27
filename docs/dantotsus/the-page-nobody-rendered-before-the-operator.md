---
date: 2026-11-09
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#281'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/quality/check-dashboard-page.ts, scripts/quality/dashboard-page.core.ts, scripts/quality/dashboard/fixture.json, .husky/pre-push, .github/workflows/ci.yml]
time-to-detect: 2 days
tags: [meta, gates, visual-validation, frontend, harness, skill]
zone: scripts/quality/dashboard/index.html
weak-point: prose-stands-in-for-a-check
recurs: [the-screens-described-instead-of-shown]
---

# The page nobody rendered before the operator

## User impact

The operator opened the 3S board on their phone twice in one morning and twice
found it broken. Both faults were in the page as written, both would have shown
in any browser, and neither had been in one.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-09 08:04, phone | Every chip blank where its sparkline should be, and a modal with a title and no chart. Console: `drawChart is not defined` | 51 sparklines and an eight-bar chart, measured after the fix |
| 2026-11-09 08:07, phone | The whole board 738 px wide in a 390 px viewport, so the headings scrolled off screen sideways | 390 px at 390, with the chips row and the defect map scrolling inside their cards |

Four more faults in the same class came from the same place: three layout rounds
on 2026-11-06 driven entirely by the operator's screenshots, the charts
stretching on a phone on 2026-11-09 07:50, the modal title running under the
Close button, and the date labels colliding. Six friction lines across two
archives, all one wall, now
`page-nobody-renders-here` in [docs/quality/working-conditions.md](../quality/working-conditions.md).

## Causal chain

- The operator saw blank chips and a modal with no chart
  - The page threw `drawChart is not defined` when a chip drew its sparkline
    - `drawChart` was declared in the second `<script>` of
      `scripts/quality/dashboard/index.html` and called bare from the third
      ← the faulty line
      - The Dashboard type runs each `<script>` in its own scope, so a name
        declared in one is not visible in another
- The operator saw the whole board 738 px wide in a 390 px viewport
  - The card's grid column was left at the implicit `auto`, which floors at
    the min-content width of the chips strip inside it ← the faulty line
    (`61b68f1` found it and set `grid-template-columns: minmax(0, 1fr)`)
- Both lines came from PR #281's session, which wrote 1,887 lines of page
  over 18 commits, squashed as `5abe4b2b8`
  - The same session wrote into `.claude/skills/quality-dashboard/SKILL.md`
    "Do not render, screenshot or browse the board to check it: the type
    forbids it" (`git log -S'the type forbids it'` names `5abe4b2b8` only),
    and rendered nothing
    - It wrote the page from the Dashboard type's instructions, which a
      publish from the type returns. Those instructions held both answers
      (quoted below), and they say only to render "if asked" (inferred, the
      transcript is gone). Man

## Root cause of occurrence

*Thought top-level scripts on one page share one scope, as they do in a
browser, and that the type forbade rendering the page, actually the type
runs each script in its own scope and asks only that the published board not
be browsed while the reader waits.* **Man.**

The type's own instructions, read from
`https://claude.ai/artifact/GZLZthZ2sQjn7T16skfdeF` on 2026-11-09:

> Render or browse to the page only if asked, since that keeps them waiting.

> Scripts run in order once the page is in place, each in its own scope.
> Anything two scripts share goes on `window`.

> The page has to read both at full width and at about 400px beside a chat: no
> fixed widths, and drawings sized from `clientWidth`.

These sentences reach an agent with the type's instructions when it creates
or writes the artifact, so they were in the session's context (inferred). The
browser's prior, one global scope for classic scripts, won over the first.
The session turned "only if asked" into "forbids" in a skill it wrote itself.
A long session of 18 commits is the worker condition the inferred lapse fits.
A Man cause needs a gate that holds when the prior wins, not one more
document.

## Detection failure causes

- **Typing:** the page is `.html`. `tsc` does not read it, and neither does
  oxlint, which lints no HTML here.
- **Tests:** `scripts/quality/*.core.ts` is gated at 100% coverage and 100%
  mutation, and every one of those tests builds rows. None of them is the page.
  The rebuild deleted the HTML renderer that tests could reach, which was the
  right subtraction and left the page itself untested.
- **The Stop hook:** `.claude/hooks/stop-screens-shown-not-described.py` blocked
  a turn that *claimed* a visual comparison with no image. The session claimed
  none. It wrote "The type forbids rendering or browsing it, so nothing further
  was run" in the pull-request body, which is an absence of a look, and the
  hook has no opinion about those.
- **CI:** no job in `ci.yml` had a browser.
- **The artifact type's `check` document:** it reported `no fault` after the
  write that shipped the scope defect. Whatever it looks at, it did not look
  at this.
- **Code review:** none. No `/technical-validation` and no `/visual-validation`
  ran on PR #281, so the diff had one reader, who was the author.

## Countermeasure

The two defects were fixed in `05d36cf` and `61b68f1`, each found by a
throwaway Playwright harness built in the session scratchpad and lost when the
container was reclaimed. This entry's eradication is that harness, committed.

## Eradication

**Type:** detection (level 4). A browser check refuses the page at push and
in CI.

**Reference:** the commit adding this file, on the kaizen branch for PR #281.

`scripts/quality/check-dashboard-page.ts` loads the real page in Chromium with
real d3, a `dash` stubbed from `scripts/quality/dashboard/fixture.json`, and
each `<script>` body wrapped in its own scope, which is how the type runs them.
It opens every row, switches every range, and refuses on a page error, on a
document wider than the viewport at 390, 768 or 1280 px, and on a sparkline or
enlarged chart that drew no bar.

```diff
+if echo "$changed" | grep -qE '^scripts/quality/(dashboard/|dashboard-page\.core\.ts|check-dashboard-page\.ts)'; then
+  start_gate dashboard-page pnpm exec tsx scripts/quality/check-dashboard-page.ts
+fi
```

It runs the page under the same per-script scoping the published board uses,
so a function declared in one script and called from another throws here
before the operator sees it. The width fault is measured rather than
eyeballed. It runs in `.husky/pre-push:324` and in the `dashboard-page` job
of `ci.yml`, not on commit: a browser launch is 4.2 s measured on 2026-11-09,
against the 300 ms a pre-commit check gets in
[docs/standards/14-tool-runtime-budgets.md](../standards/14-tool-runtime-budgets.md).
That makes it detection, level 4, and not an impossibility. The scope fault
can still be written.

The fixture is generated by the real builders in
`scripts/quality/quality-datasets.core.ts`, six applications over all three
ranges, so the chips row is as wide as the operator's. The CSS custom
properties the page reads are defined from the board's own
`artifact-type/app.css`, version `1794047892-ef8d`, light theme and default
density: an undefined custom property computes to nothing, which would have
measured a page with no gaps and no padding. See
[docs/dantotsus/an-undefined-custom-property-paints-black.md](./an-undefined-custom-property-paints-black.md).

The skill now separates the published board from the page file, names the
per-script scoping and the 375 px floor, and names the command.
`docs/knowledge/the-dashboard-artifact-types-page-contract.md` carries the
same contract with `triggers:` on the page's path and on the check's
refusal.

**Proposed:** subtract the second and third scripts. Merge the page's three
`<script>` blocks (`scripts/quality/dashboard/index.html:367`, `:411` and
`:525`) into one, and make `check-dashboard-page.ts` refuse a page with more
than one. A name shared across scripts then cannot exist, which turns the
scope fault into a structural impossibility. The width fault stays
detection.

**Proof it can fail:** `drawChart` and `PANEL` put back into the second
script's own scope and called bare from the third, as `05d36cf` found them.
Exit 1:

```
  the page threw: drawChart is not defined
  every sparkline drew no bar, so the chips show no series
  the enlarged chart drew no bar, so opening a chip shows an empty modal
```

And the card's `grid-template-columns: minmax(0, 1fr)` removed, leaving the
implicit `auto` column `61b68f1` found. Exit 1:

```
  at 390 px the page is 716 px wide, so the whole board scrolls sideways instead of the strip inside it
  at 768 px the page is 1106 px wide, so the whole board scrolls sideways instead of the strip inside it
  at 1280 px the page is 1578 px wide, so the whole board scrolls sideways instead of the strip inside it
```

The widths are the fixture's, not the board's: six applications with this
repository's own slugs in the chips, where the operator's board measured 738 px
at 390. The fault is the same and the check catches it at every width, the
desktop included, where the operator's own screenshots never showed it.

**Similar instances:** `grep -rln 'files/index.html' .claude/skills/` names the
3S board only, so this is the one page in the repository that ships to an
artifact store. Every other front end goes through `pnpm dev` and a preview.
