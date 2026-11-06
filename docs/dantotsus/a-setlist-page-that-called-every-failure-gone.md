---
date: 2026-11-05
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: none (the setlist pages came in 9f4b443eb on 2026-08-19, and offline reading made the lie reachable in #247)
fix-pr: none (the kaizen pull request for #278, not opened when this was written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/routes/setlists/missing-setlist.core.ts, apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx, apps/pragma/site/src/routes/setlists/SetlistScenePage.tsx, apps/pragma/site/src/routes/setlists/SetlistOrderPage.tsx, apps/pragma/site/src/routes/sessions/PracticeModePage.tsx]
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
        <NotFoundNotice message={t('setlist.notFound')} … />
        ```

The song and session pages did not have it. Since 1b5402aec (2026-08-14),
they pick their message from `selectMissingRecordReason(error)`, which says
"not found" only for a `404`. The setlist pages came five days later
(9f4b443eb) and wrote the literal. So did the practice mode page for a
missing session.

## Root cause of occurrence

*Thought a missing setlist on a page that finished loading means the setlist
was deleted, actually a read that failed or is paused offline also leaves it
missing, and only a `404` means deleted.*

`@tanstack/query-core` 5.102.8 `src/queryObserver.ts`, read this session:
`const isLoading = isPending && isFetching` (line 585).

## Detection failure causes

- **Reuse:** the helper that separates the two cases sat in
  `lib/missing-record.utils.ts`. Nothing pointed a new page at it, and a
  literal key type-checks.
- **Tests:** no setlist page test rendered a setlist that was missing.
- **Offline:** offline reading from the cache shipped in #247 on 2026-11-03.
  Before it, an offline open never reached the page.

## Countermeasure

PR #278 (7cde5696c) made the preload read each next setlist, so the
next-concert case renders. Other setlists and refused reads still lied.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit that adds this file.

`routes/setlists/missing-setlist.core.ts` maps the shared reason to a key, as
`missing-song.core.ts` and `missing-session.core.ts` already did. All three
setlist pages and the practice mode page now pass the query's error through
it. A setlist page can no longer say "gone" for a read that failed, because
the key comes from the error.

```diff
-        message={t('setlist.notFound')}
+        message={t(selectMissingSetlistMessageKey(setlistQuery.error))}
```

**Proof it can fail:** the literal planted back in `SetlistScenePage.tsx`,
then `vitest run --project core site/src/routes/setlists/SetlistScenePage`:

```
× says the page cannot be loaded, not that the setlist is gone, when the read is paused offline
AssertionError: expected 'This setlist no longer exists.' to be 'This page could not be loaded. Check …'
Tests  1 failed | 13 passed (14)
```

Reverted after.

**Similar instances:** `grep -rn "<NotFoundNotice" -A4 apps/pragma/site/src/routes | grep "message="`
lists ten call sites. Nine now read the error. The tenth,
`PracticeModePage.tsx:64`, answers a URL with no session id, which is a
true not-found.
