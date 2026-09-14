---
date: 2026-09-14
introduced-at: implementation
detected-at: linter
severity: medium
related-pr: '#95'
fix-pr: '#96'
fix-commits: [5d14095]
eradication-level: 4
time-to-detect: minutes
tags: [eslint, cache, typescript, deps, hooks, harness, knowledge-corpus, self-improvement-loop]
---

# Twenty-four errors that were already fixed, and the entry that had said so all along

## Symptom

A dependency bump moved `@hono/zod-validator` from 0.4 to 0.9. ESLint reported
24 errors across pragma's query modules:

```
apps/pragma/site/src/lib/queries/songs.queries.ts
  100:18  error  Unsafe assignment of type `any[]`  @typescript-eslint/no-unsafe-assignment
  102:64  error  Unsafe argument of type error typed  @typescript-eslint/no-unsafe-argument
```

The cause was found and fixed: `isResponseSuccessful` returned `boolean`, which
narrows nothing, so the new response union stayed unnarrowed at every call
site. `tsc --noEmit` went clean across all six projects.

ESLint reported the same 24 errors. Same files, same lines, same rules. Nothing
distinguished them from the errors before the fix.

## Root-cause chain

1. **Why did ESLint report errors the fix had removed?**
   `.husky/pre-commit` runs `eslint --cache --cache-strategy content`, which
   keys each entry on the linted file's own bytes. The query modules were not
   edited — the fix was in `api.client.ts` — so every one of them was a cache
   hit and replayed its stored result.

2. **Why is that wrong for these rules?**
   A type-aware rule's verdict depends on the whole type graph, not on the file
   in front of it. There is no cache strategy that expresses "invalidate on the
   project": `metadata` has the identical flaw for the identical reason.

3. **Why was the wrong conclusion the natural one?**
   Because the symptom argues against the cause. A stale cache should feel like
   staleness, and this does not: re-running reproduces the errors exactly, which
   is the signature of a *real* error. The available reading is "my fix did not
   work".

4. **Why did the written answer not help?**
   `docs/knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md`
   describes this precisely, names `rm -f .eslintcache`, and predates this pull
   request. It was not read, because a knowledge entry is a lookup and the
   search term is the answer.

5. **Why did that failure recur after being eradicated once?**
   It has a dantotsu of its own —
   `a-knowledge-entry-did-not-stop-the-second-hit.md` — which closes by saying
   that the next sweep classifying something as `knowledge` should ask whether
   the symptom argues against the cause, because level 5 is not enough when it
   does. Here it does, and the entry was still only knowledge.

**Root cause:** thought a cache keyed on a file's content is safe for any rule
that reads that file, actually a type-aware rule reads the file's whole
dependency graph — so a fix landing in another file leaves every dependent's
verdict cached, correct-looking and wrong.

## Detection failure causes

- **Typing:** `tsc` was clean and disagreed with ESLint. The disagreement was
  the tell and read as a tooling quirk.
- **Linter:** the linter is the defect; it reported with full confidence.
- **CI:** would have caught it, on a fresh checkout with no cache — after a
  push, minutes later, for something already fixed locally.
- **Code review:** invisible in a diff.
- **Knowledge:** present, correct, well written, unread. Second occurrence of
  exactly that.

## Countermeasure

- **Code:** commit `5d14095` — a hook now names the cache whenever type-aware
  errors are reported and `.eslintcache` exists.
- **Operator action:** `rm -f .eslintcache && pnpm run lint` settles it in one
  command; errors that survive are real.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a PostToolUse hook on the lint run itself)

**Reference:** [PR #96](https://github.com/hugoleborso/borso.fr/pull/96) ·
commit [`5d14095`](https://github.com/hugoleborso/borso.fr/commit/5d14095)

Level 1 was considered and rejected: dropping `--cache` makes the class
impossible, and
[`eslint-cache-useless-on-a-fresh-checkout.md`](./eslint-cache-useless-on-a-fresh-checkout.md)
already measured what the cache is worth on a warm one. Paying that on every
commit to avoid a few confused minutes is the wrong trade. Level 2 has no
surface — no lint rule can see another tool's cache.

So the sentence moves to where the wrong conclusion is formed, exactly as the
empty-checks hook did for conflicted pull requests.
`.claude/hooks/posttool-eslint-cache-replays-a-fixed-error.sh` fires only when
a lint command reports an error from one of ten type-aware rules **and**
`.eslintcache` exists **and** the command did not already clear it.

**The actual fix:**

```diff
+TYPE_AWARE='no-unsafe-argument|no-unsafe-assignment|no-unsafe-call|…'
+COUNT=$(printf '%s' "$RESPONSE" | grep -cE "@typescript-eslint/($TYPE_AWARE)")
+[ "${COUNT:-0}" -gt 0 ] || exit 0
+
+  rm -f .eslintcache && pnpm run lint
```

It never asserts staleness — these errors are usually real — and always exits
0, so it can never block a lint run.

**Sibling defects swept:** none. The knowledge entry stays as the detail the
hook points at.

## See also

- [`../knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md`](../knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md)
  — the entry this is about. Still right; now reachable.
- [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md)
  — the general rule this is the second instance of, and the hook shape copied
  from it.
- [`eslint-cache-useless-on-a-fresh-checkout.md`](./eslint-cache-useless-on-a-fresh-checkout.md)
  — the other half: the measurement that keeps the cache despite this.
