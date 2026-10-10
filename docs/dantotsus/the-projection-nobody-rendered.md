---
date: 2026-10-10
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '9a94594'
fix-pr: '#154'
fix-commits: [c229a98, bd60cb7]
eradication-level: 4
time-to-detect: days
tags: [pragma, react, testing]
---

# The projection nobody rendered

## Symptom

Filtering a setlist to one member is how a member answers "what do I play at
the concert". The filter still worked, but no row said which instrument that
member played on each song. Found while measuring the *my part* job in PR #151.

## Root-cause chain

1. **Why did rows not name the instrument?** `SetlistEntryRow` did not render
   it. `setlist-filter.core.ts` still computed it per row.
2. **Why was it computed and not rendered?** `9a94594` replaced the row's
   instrument text with the lineup glyph column. The projection kept its
   caller, so nothing looked unused.
3. **Why did no test notice?** The core's tests checked the projection, and no
   component test checked that a row shows it. The answer the member needed
   lived between the two.

**Root cause:** we thought a tested projection meant a shown answer, and
actually only a test on the rendered row can say the member sees it.

## Detection failure causes

- **Typing:** an unused field of a returned object is not an error.
- **Linter:** `scripts/check-pure-modules-have-callers.sh` and knip see the
  function's caller, not whether its result reaches the screen.
- **CI:** no component test rendered a filtered row.
- **Code review:** the glyph change was the visible subject of `9a94594`.

## Countermeasure

- **Code:** commit `c229a98` (PR #151) — the editor passes `memberPart` to each
  row and the row renders it under the title.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a component test on the rendered row)

**Reference:** [PR #154](https://github.com/hugoleborso/borso.fr/pull/154) · commit `bd60cb7`

**The actual fix:**

```diff
+  it('names what that member plays on the song', () => {
+    render(<SetlistEntryRow {...buildProps(['Bass', 'Backing vocals'])} />);
+    expect(screen.getByText('Bass + Backing vocals')).toBeTruthy();
+  });
```

Removing the label from the row fails this test (checked by hand on
2026-10-10). The *my part* journey of `pnpm run task-speed` covers the same
answer end to end, by hand only.

**Sibling defects swept:** the same sweep found `mastery.subtitle` and
`scaffold.subtitle`, two messages no component rendered; removed in `d26622c`.

## See also

- [`the-audit-that-measured-buttons-not-jobs.md`](./the-audit-that-measured-buttons-not-jobs.md)
