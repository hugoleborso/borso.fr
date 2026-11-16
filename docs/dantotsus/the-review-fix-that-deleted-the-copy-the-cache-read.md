---
date: 2026-11-16
introduced-at: code-review
detected-at: review
severity: low
related-pr: '#363'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/domain/chart-label.core.ts, apps/pragma/api/src/songs/songs.schema.ts, apps/pragma/site/src/routes/catalog/song-chart-cards.core.ts]
time-to-detect: minutes
tags: [pragma, domain, adr-2026-08-13T0026, validation, react]
zone: apps/pragma/site/src/routes/catalog
recurs: [the-boundary-a-sentence-held-and-a-copy-crossed]
---

# The review fix that deleted the copy the cache read

## User impact

No member saw it. The second technical review caught it on the branch of
PR #363, before the merge (measured, `technical-validation-2026-11-16-0203.md`
row A01).

| | Seen | Expected |
| --- | --- | --- |
| Saving a song whose chart has no label, before the API answers | The chart pill reads "Guitare · " | "Guitare" |
| The same save while offline | The wrong pill stays until the device reconnects | "Guitare" |

## Causal chain

- A pill read "Guitare · " after a save.
  - The optimistic song cache stored the save payload's `label: ''`.
    - The site stopped turning a blank label into `null`.
      - Round 1 finding B14 said the site restated the API's label rule, and
        the fix agent deleted the site's copy.
        - Round 2 then dismissed B14 and put the copy back, so the site
          and the API still held the rule twice.

## Root cause of occurrence

*Thought the remedy for a restated rule is to delete the site's copy, actually
the remedy is to move the rule to `domain/`.*

`docs/standards/02-purity-and-core-files.md` already said the second half:
"The rule both sides apply moves to `apps/<app>/domain/`, and both import it
from `@domain/*`." Its `reviewer` bullet, which B14 cited, named only the
smell: "a limit or a rule written in a site does not restate one the API
enforces". The validator wrote "Fix size: one line", and one line is the
deletion. The site's copy was not dead. `songs.queries.ts` writes the payload
into the caches as a stored chart, so it is read as the API's output.

## Detection failure causes

- **Typing:** `label: string | null` accepts `''` as well as `null`.
- **Lint:** `borso/no-api-declaration-repeated-in-site` compares names, and
  the site's copy was an inline expression with no name.
- **Review:** worked. Round 2 found it in minutes.

## Countermeasure

`normalizeChartLabel` in `apps/pragma/domain/chart-label.core.ts` trims and
turns a blank label into `null`. The API's `chordChartSchema` and the site's
`chartFromCard` both call it. The API's `nullWhenEmpty` is gone.
The `reviewer` bullet in standard 02 now names the remedy: move the rule to
`domain/`, never delete the site's copy.

## Eradication

**Type:** structural impossibility (level 1). The label rule has one home,
so the site and the API cannot disagree on it, and deleting the site's call
leaves a pill test red.

**Reference:** the commit adding this file.

```diff
-  const trimmedLabel = card.label.trim();
   const assignment = {
     instrumentIds: [...card.instrumentIds],
-    label: trimmedLabel.length === 0 ? null : trimmedLabel,
+    label: normalizeChartLabel(card.label),
   };
```

**Proof it can fail:** planting the round-1 fix (`label: card.label`) in
`chartFromCard` fails two tests in `song-draft.core.test.ts`:

```
FAIL  |core| site/src/routes/catalog/song-draft.core.test.ts > chartsFromDraft > titles the pill of a chart saved with a blank label by its instruments alone
AssertionError: expected [ 'Guitare ·   ' ] to deeply equal [ 'Guitare' ]
```

**Similar instances:** `grep -rn "trim()" apps/pragma/site/src --include=*.core.ts`
lists the site's other trims. Each sits on a form field the API does not
normalise under the same rule, so none moved here.
