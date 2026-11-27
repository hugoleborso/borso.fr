---
date: 2026-11-05
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: none (the setlist pages came in 9f4b443eb on 2026-08-19, and offline reading made the lie reachable in #247)
fix-commits: [self]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/routes/setlists/missing-setlist.core.ts, apps/pragma/site/src/routes/setlists/SetlistScenePage.test.tsx]
time-to-detect: 2 days
tags: [pragma, offline, tanstack-query, i18n]
zone: apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx
recurs: none (the-offline-cache-that-answered-first-online shares pragma, offline and tanstack-query, but its class is a cache answering before the network; this one is a page naming a failed read as a deletion)
---

# A setlist page that called every failure gone

## User impact

PR #278's visual validation opened pragma offline, as a member would on the
way to a concert. Home showed the next setlist's six songs. Its link "Open
the setlist" showed "This setlist no longer exists." under the banner that
promises the next-concert setlist offline (row 30, measured, screenshot
`14-offline-setlist-375.png`). `origin/main` showed the same (measured by
`fix-3`).

| | Seen | Expected |
| --- | --- | --- |
| Offline, `/setlists/:id` for the next concert | "This setlist no longer exists." | the setlist |
| Offline, any other setlist, or a read refused online | "This setlist no longer exists." | "This page could not be loaded. Check the connection, then try again." |

## Causal chain

- The page said the setlist no longer existed.
  - `setlist` was `null` and `isLoading` was `false`, so the page fell through
    to its not-found branch.
    - Offline, TanStack pauses a query with no data. `isLoading` is
      `isPending && isFetching`, and a paused query is not fetching. A refused
      read leaves `data` undefined the same way.
      - The message was a literal, chosen without reading the error:

        ```tsx
        <NotFoundNotice message={t('setlist.notFound')} … />   // ← the faulty line
        ```

        - Commit 9f4b443eb (2026-08-19, an agent session) wrote the setlist
          pages with that literal, and the practice mode page's missing
          session the same way.
          - `NotFoundNotice` takes `message: string`
            (`components/molecules/NotFoundNotice.tsx:5`). A literal key
            type-checks, and reading the error is optional. The correct form
            costs a new per-entity `missing-*.core.ts` file. The wrong form
            costs nothing. **Machine.**

## Root cause of occurrence

*Thought a missing setlist on a page that finished loading means the setlist
was deleted, actually a read that failed or is paused offline also leaves it
missing, and only a `404` means deleted.* **Man** (inferred, no transcript
read): the right pattern sat in the same app. At the parent commit, all four
`NotFoundNotice` call sites passed `selectMissing*MessageKey(query.error)`
(`git grep -A3 '<NotFoundNotice' 9f4b443eb^ -- apps/pragma/site/src`), and
the prior "not loaded means not found" won over them.

`@tanstack/query-core` 5.102.8 `src/queryObserver.ts`, read this session:
`const isLoading = isPending && isFetching` (line 585).

## Detection failure causes

- **Typing:** `message: string` accepts any key, so the type says nothing
  about which reason the page names.
- **Tests:** no setlist page test rendered a setlist that was missing.
- **Offline:** offline reading from the cache shipped in #247 on 2026-11-03.
  Before it, an offline open never reached the page.

## Countermeasure

PR #278 (7cde5696c) made the preload read each next setlist, so the
next-concert case renders. Other setlists and refused reads still lied.

`routes/setlists/missing-setlist.core.ts` then mapped the shared reason to a
key, as `missing-song.core.ts` and `missing-session.core.ts` already did. All
three setlist pages and the practice mode page's session read pass the
query's error through it.

```diff
-        message={t('setlist.notFound')}
+        message={t(selectMissingSetlistMessageKey(setlistQuery.error))}
```

## Eradication

**Type:** detection (level 4)

**Reference:** the commit that added this file.

What holds today is the setlist scene page's test, which renders a read
paused offline and expects the load-failed message. It guards the setlist
pages. It does not guard the class. The level 1 this entry first claimed was
wrong: the class came back five days later. `routes/compos/SketchPage.tsx:51`
(c4ec9b94e, PR #327, 2026-11-14) renders `t('sketch.notFound')` for any null
sketch, though `useSketch` is a network query that can fail or pause the
same way.

**Proposed:** make the molecule hold the rule. `NotFoundNotice` takes a
`reason: MissingRecordReason`, or the query's `error`, plus the entity's
not-found key, and picks `common.loadFailed` itself for every reason but
`not-found`. The three `missing-*.core.ts` files are then deleted. A page can
no longer pass a free string, so it cannot call a failed read "gone".
`PracticeModePage.tsx:65`, which answers a URL with no session id, passes an
explicit `'not-found'`.

**Proof it can fail:** the literal planted back in `SetlistScenePage.tsx`,
then `vitest run --project core site/src/routes/setlists/SetlistScenePage`:

```
× says the page cannot be loaded, not that the setlist is gone, when the read is paused offline
AssertionError: expected 'This setlist no longer exists.' to be 'This page could not be loaded. Check …'
Tests  1 failed | 13 passed (14)
```

Reverted after.

**Similar instances:** `grep -rn "<NotFoundNotice" -A4 apps/pragma/site/src/routes | grep "message="`
lists twelve call sites today (measured 2026-11-27). Ten read the error.
`PracticeModePage.tsx:65` answers a URL with no session id, a true
not-found. `SketchPage.tsx:51` is the open instance.
