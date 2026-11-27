---
date: 2026-08-15
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#50'
fix-commits: [531e6e472f, 4065faa447]
eradication-level: 2
eradication-paths: [eslint-rules/no-discarded-await-before-navigation.js]
time-to-detect: 3 months
tags: [react, tanstack-query, optimistic-update, frontend, pragma, custom-rule]
zone: apps/pragma/site/src/lib/queries
weak-point: optimistic-write-undone
recurs: [optimistic-reorder-reverted-by-stale-dsql-read]
blueprints: [query-optimistic-mutation]
---

# The optimistic update nobody could see

## User impact

> Updating the artist of a song does no optimistic update too…

| | Seen | Expected |
| --- | --- | --- |
| Edit a song's artist, press Save, on a real connection | The form stays still until the server answers, then the song page opens | The song page opens at once with the new artist |

Every band member editing a song was affected. The catalog row and the song
page both had correct optimistic writes behind them, and nobody could see
either.

## Causal chain

- Nothing moved on screen until the round trip finished
  - The form stayed open, and it reads its values from `defaultValues`
    captured at mount, not from the patched cache
    - The caller awaited the write before navigating ← the faulty line, in
      `SongEditPage.tsx`

      ```ts
      await updateSong.mutateAsync({ id: songId, ...payload }); // holds the form for the round trip
      navigate(`/catalog/${songId}`);
      ```

      - `useUpdateSong().onMutate` did patch `songKeys.list()` and
        `songKeys.byId(id)`, but only on the page the member had not been
        sent to yet
      - Commit `4b678d898` (2026-05-25, the TanStack Query migration) wrote
        that line one for one in place of `await apiRequest(…PUT…)`, inside
        the `try`/`catch` that reports a failed save. The hook then had no
        `onMutate`, so the await was correct
        - Commit `a079ca659` (2026-05-25, "optimistic updates on song
          create/update/delete") added `onMutate` to `useUpdateSong` and
          touched only `songs.ts`. The caller kept its await
          - The repository's only guidance on optimistic writes,
            `CLAUDE.md:62` at that commit, described them as hook options:
            "does `onMutate`/`onError`-style optimistic updates with
            rollback". It said nothing of the caller. Material

## Root cause of occurrence

*Thought a write becomes optimistic when its hook patches the cache in
`onMutate`, actually it becomes optimistic when the screen moves before the
server answers, and an awaited `mutateAsync` before the navigation cancels
that while leaving every sign of it in place.* **Material.**

The agent that wrote `a079ca659` changed one file, the hook. The document in
its context, `CLAUDE.md` line 62 at `a079ca659^`, framed an optimistic update
as a property of the mutation:

> Every mutation either calls `queryClient.invalidateQueries({ queryKey })` in
> `onSuccess` (default) or does `onMutate`/`onError`-style optimistic updates
> with rollback.

Nothing it read said the caller decides when the screen moves. The await it
left in place had been correct a few hours earlier, when the hook was not
optimistic.

## Detection failure causes

- **Typing:** both shapes type-check. `mutateAsync` returning a promise nobody
  reads is legal.
- **Linter:** no rule looked at what happens after an awaited write.
- **Local validation:** a local API answers in single-digit milliseconds. The
  defect is a latency defect, and the local environment has no latency to
  expose it.
- **CI:** the tests assert `onMutate` patches the cache, which it does. A unit
  test of a query hook cannot assert what the member sees.
- **Code review:** `a079ca659` showed only the hook, so the caller was not in
  the diff. An `await` before a navigation reads as careful, not as a stall.
- **QA:** the operator found it by using the app on a real connection, the
  only place it shows.

## Countermeasure

Commit `531e6e4` fires the update and navigates:
`updateSong.mutate({ id, ...payload }); navigateTo(\`/catalog/${songId}\`)`.
The create path keeps its `await`, because the route it goes to needs the
server-issued id.

That move takes away where a failure used to be reported, so it also ships
`didLastSongWriteFail`, a pure selector over the mutation cache, and a banner
on the song page saying the last save did not go through and that the song
below is as it was before the edit. It clears as soon as a later write for
that song succeeds. Verified with the `PUT` aborted in the browser: the
detail page opens on the new artist, then rolls back and says so.

The delete path in the same file had the same shape. It now fires and
navigates too, and `selectSongThatLostItsLastWrite` names the song on the
catalog when the delete fails.

## Eradication

**Type:** DevX check (level 2), for the shape it matches.

**Reference:** [PR #51](https://github.com/hugoleborso/borso.fr/pull/51),
`eslint-rules/no-discarded-await-before-navigation.js`

```diff
+      statements.forEach((statement, index) => {
+        if (!isDiscardedAwaitOfMutation(context, statement)) return;
+        const follower = statements[index + 1];
+        if (follower === undefined) return;
+        if (!statementNavigates(follower)) return;
+        context.report({ node: statement, messageId: 'discardedAwait' });
+      });
```

The rule reports an awaited `mutateAsync` whose result is discarded, on a
receiver built by a hook named `useCreate…`, `useUpdate…` or `useDelete…`,
when the next statement navigates. A create that uses the returned id is
left alone. A login, which has no optimistic cache, is left alone.

**Proof it can fail:** the rule flags both `SongEditPage` sites in
`531e6e4^`, and over the whole front end it flagged nothing after the fix.

**Gap in what holds:** the rule keys on the hook's name and on a navigation.
The same defect lives on today in
`apps/pragma/site/src/components/organisms/BandLinksSection.tsx:35`:
`await add.mutateAsync(…)` then `setIsAdding(false)`, where `useAddBandLink`
declares an `onMutate` (`band-links.queries.ts:81`). Its hook is named
`useAdd…` and closing a sheet is not a navigation, so the rule passes it.
`PasskeyNameSheet.tsx:38` has the same shape, but `useRenamePasskey` has no
`onMutate`, so its await is correct.

**Proposed:** key the rule on the fact, not the name. Report a discarded
`await` of `mutateAsync` whose hook declares `onMutate`, whatever statement
follows, in `eslint-rules/no-discarded-await-before-navigation.js`. That makes
it impossible to hide an optimistic write behind an await, whether the next
step navigates, closes a sheet or resets a form. A create that uses the
returned value stays allowed.

**Similar instances:** `grep -rn 'await .*\.mutateAsync' apps/*/site/src`
lists the candidates. `BandLinksSection.tsx:35` is the one confirmed above.
