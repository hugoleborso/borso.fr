---
date: 2026-08-15
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#50'
fix-pr: '#51'
fix-commits: [531e6e4]
eradication-level: 2
time-to-detect: 3 months
tags: [react, tanstack-query, optimistic-update, frontend, pragma, custom-rule]
---

# The optimistic update nobody could see

## Symptom

> Updating the artist of a song does no optimistic update too…

Editing a song's artist and pressing Save left the operator watching a still
form until the server answered, then moved them to the song page. The catalog
row and the song page both had correct optimistic writes behind them.

## Root-cause chain

1. **Why did nothing appear immediately?** The page did not change until the
   round trip finished.
2. **Why not — was the write not optimistic?** It was.
   `useUpdateSong().onMutate` cancels the in-flight reads, snapshots both
   caches, patches `songKeys.list()` and `songKeys.byId(id)`, and returns the
   snapshot for rollback. All of it correct, and all of it invisible.
3. **Why invisible?** The caller awaited the round trip before moving:
   `await updateSong.mutateAsync({ id, ...payload }); navigateTo(…)`. The
   operator was still on the form, which reads its values from `defaultValues`
   captured at mount, not from the patched cache. The only surface showing the
   new values was the page they had not been sent to yet.
4. **Why was it written that way?** Because the create path directly above it
   has to await — it navigates to `/catalog/<id>` and only the server can issue
   that id — and the update path was written to match its shape.
5. **Why did nobody notice for three months?** Locally the round trip is a few
   milliseconds, so the two shapes are indistinguishable on a dev machine. It
   only reads as broken over a real network, which is where the operator was.

**Root cause:** thought *"a write is optimistic when `onMutate` patches the
cache"*, actually *"it is optimistic when the interface moves before the server
answers, and awaiting the result before navigating cancels the whole benefit
while leaving every sign of it in place"*.

## Detection failure causes

- **Typing:** both shapes type-check; `mutateAsync` returning a promise nobody
  reads is legal.
- **Linter / static analysis:** no rule looked at what happens *after* an
  awaited write. This is the gap the eradication closes.
- **Functional validation locally:** a local API answers in single-digit
  milliseconds. The defect is a latency defect and the local environment has no
  latency to expose it.
- **CI:** the tests assert `onMutate` patches the cache — which it does. Nothing
  asserts the operator sees it, and a unit test of a query hook cannot.
- **Code review:** the awaited call reads as careful rather than wrong. `await`
  before navigation looks like correctness, not like a stall.
- **PO / QA validation:** the operator found it by using the app on a real
  connection, which is the only place it is visible.

## Countermeasure

- **Code:** commit `531e6e4` — the update path fires and navigates:
  `updateSong.mutate({ id, ...payload }); navigateTo(\`/catalog/${songId}\`)`.
  The create path keeps its `await`, because the route it goes to needs the
  server-issued id.

That move takes away where a failure used to be reported, so it also ships
`didLastSongWriteFail`, a pure selector over the mutation cache, and a banner on
the song page: *the last save did not go through — what you read below is the
song as it was before the edit*. It clears as soon as a later write for that
song succeeds. Verified with the `PUT` aborted in the browser: the detail page
opens on the new artist, then rolls back and says so.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a custom lint rule rejects the shape)

**Reference:** [PR #51](https://github.com/hugoleborso/borso.fr/pull/51) ·
`eslint-rules/no-discarded-await-before-navigation.js` on this branch

```diff
+      statements.forEach((statement, index) => {
+        if (!isDiscardedAwaitOfMutation(context, statement)) return;
+        const follower = statements[index + 1];
+        if (follower === undefined) return;
+        if (!statementNavigates(follower)) return;
+        context.report({ node: statement, messageId: 'discardedAwait' });
+      });
```

The discriminator is whether the awaited value is *used*. A create assigns it
and needs it; an update discards it and is therefore waiting for nothing. The
rule reports only the second shape, and only when a navigation follows in the
same block.

Getting the scope right took a false positive worth recording. The first draft
flagged `await login.mutateAsync({ password }); navigateTo('/catalog')`, which
is correct code — a login has no optimistic cache standing in for the session,
and a wrong password has to keep the operator on the form. So the rule now
resolves the receiver's declaration and reports only writes a cache can answer
for: `useCreate…`, `useUpdate…`, `useDelete…`. An unresolvable receiver is left
alone rather than guessed at.

Verified against the pre-fix file: the rule flags both `SongEditPage` sites in
`531e6e4^`, and against the whole front end it now flags exactly one line.

**Sibling defects swept:** that one line is the delete path in the same file,
and it keeps its `await` behind a written exception. A delete is the one write
where waiting is the point — the operator should not walk away believing a song
is gone until the server says so, and the form's error line is the only place a
failed delete can be reported, since `/catalog` shows the row returning but says
nothing about why.

## See also

- [`optimistic-reorder-reverted-by-stale-dsql-read.md`](./optimistic-reorder-reverted-by-stale-dsql-read.md)
  — the other half of the same lesson: having written optimistically, do not
  then re-read a write the client already knows the result of.
- `docs/standards/07-data-fetching.md` — the TanStack Query contract.
