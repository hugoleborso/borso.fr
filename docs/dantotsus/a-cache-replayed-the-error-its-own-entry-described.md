---
date: 2026-09-14
introduced-at: implementation
detected-at: linter
severity: medium
related-pr: '#95'
fix-commits: [5d140956dd, 9dcf74547]
eradication-level: 1
eradication-paths: [scripts/lint-repository.sh, .husky/pre-commit]
time-to-detect: minutes
tags: [eslint, cache, typescript, deps, hooks, harness, knowledge-corpus, self-improvement-loop]
zone: .husky/pre-commit
weak-point: prose-stands-in-for-a-check
recurs: [a-knowledge-entry-did-not-stop-the-second-hit]
---

# Twenty-four errors that were already fixed, and the entry that had said so all along

## User impact

The session working on PR #95 was the user. A dependency bump moved `@hono/zod-validator` from 0.4 to 0.9, and ESLint reported 24 errors across pragma's query modules. The session found the cause and fixed it in `api.client.ts`: `isResponseSuccessful` returned `boolean`, which narrows nothing. `tsc --noEmit` then went clean across all six projects. ESLint still reported the same 24 errors, on the same files, lines and rules. The session read that as a fix that did not work.

| | Seen | Expected |
| --- | --- | --- |
| Lint after the fix | The same 24 type-aware errors | No error, as `tsc` said |

<details><summary>Two of the 24 errors</summary>

```
apps/pragma/site/src/lib/queries/songs.queries.ts
  100:18  error  Unsafe assignment of type `any[]`  @typescript-eslint/no-unsafe-assignment
  102:64  error  Unsafe argument of type error typed  @typescript-eslint/no-unsafe-argument
```

</details>

## Causal chain

- ESLint reported 24 errors the fix had removed.
  - Every query module was a cache hit, so ESLint replayed its stored result. The fix was in `api.client.ts`, and the query modules were not edited.
    - `.husky/pre-commit` and the `lint` script ran ESLint with a cache keyed on each linted file's own bytes.

      ```sh
      # .husky/pre-commit, from cbc90eca8 until 9dcf74547
      echo "$staged_lintable" | xargs pnpm exec eslint --no-warn-ignored --cache --cache-strategy content --cache-location .eslintcache  # ❌ type-aware verdicts cached per file
      ```

      - Commit `314f24821` (2026-08-08, written by an agent) replaced Biome with ESLint. It turned on the typescript-eslint type-checked rules and `--cache` in the same commit. Its message gives the reason: "A warm cache brings it to 3.2 s". Commit `cbc90eca8` later switched the key from mtime to content, so the cache would hit on a CI runner.
        - The agent's input was a runtime budget for the lint step and ESLint's own `--cache` option. That option is documented per file, and nothing in the input tied a type-aware verdict to other files. (Material, inferred from the commit message, which names only timings.)

## Root cause of occurrence

*Thought a cache keyed on a file is safe for any rule that reads that file, actually a type-aware rule reads the file's whole dependency graph, so a fix in another file leaves every dependent's cached verdict correct-looking and wrong.*

Material. The agent that wrote `314f24821` worked from a lint budget and the ESLint CLI flag. The caveat lives in typescript-eslint's documentation, not in the flag's, and the commit names no source for it (inferred, the transcript is gone). The same misconception survived `cbc90eca8`, whose message reasons only about mtime against content.

The knowledge entry [`eslint-content-cache-replays-a-stale-type-aware-error.md`](../knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md), added in `615774e49` on 2026-08-20, already stated the fact and the command `rm -f .eslintcache`. It predates PR #95.

## Detection failure causes

- **Typing:** `tsc` was clean and disagreed with ESLint. The disagreement was the tell, and it read as a tooling quirk.
- **Linter:** the linter was the defect. A replayed error looks exactly like a real one, and re-running reproduces it, which is the signature of a real error.
- **CI:** CI restored the same content-keyed cache, so it could replay the same verdicts.
- **Knowledge:** the entry was a lookup. To find it, the session had to search for the answer, "cache", while the symptom pointed at its own fix. [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md) records the same failure once before.

## Countermeasure

`rm -f .eslintcache && pnpm run lint` settles it. Errors that survive are real. Commit `5d140956dd` added a PostToolUse hook that named the cache whenever a lint run reported a type-aware error while `.eslintcache` existed. Commit `eaf16df21` later ported it to `scripts/hooks/checks/eslint-cache-replays-a-fixed-error.core.ts`.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit [`9dcf74547`](https://github.com/hugoleborso/borso.fr/commit/9dcf74547) (PR #197) replaced ESLint with oxlint. It met the same runtime budget with a faster tool instead of a cache.

```diff
-ESLINT_FLAGS=(--max-warnings 0 --cache --cache-strategy content "$@")
+node_modules/.bin/oxlint --type-aware "$@" .
```

`scripts/lint-repository.sh` and the `oxlint` step of `.husky/pre-commit` now run with no cache, and `oxlint --help` lists no cache option (measured on 1.91.0). No script, hook or workflow calls the ESLint CLI any more (measured with `git grep -nE "(exec|bin/|^\s*)eslint "`, no match). A verdict can no longer be replayed from a cache.

The first version of this entry rejected level 1 because the cache was worth its cost, per [`eslint-cache-useless-on-a-fresh-checkout.md`](./eslint-cache-useless-on-a-fresh-checkout.md). The oxlint migration removed that trade.

**Proposed:** delete `scripts/hooks/checks/eslint-cache-replays-a-fixed-error.core.ts`, its test, and its registration in `scripts/hooks/hook-events.ts`. It watches for a `.eslintcache` that nothing writes. The two `.eslintcache` lines in `.gitignore` go with it.

**Proof it can fail:** not applicable to a removal. There is no cache left to plant a stale entry in.

**Similar instances:** `git grep -n "cache-strategy" HEAD -- ':!docs'` finds only the dead hook and its test. Prettier, the other tool CI cached, was replaced by oxfmt in the same commit, per its ADR `docs/adr/2026-10-27T2320-oxlint-and-oxfmt-replace-eslint-and-prettier.md`.
