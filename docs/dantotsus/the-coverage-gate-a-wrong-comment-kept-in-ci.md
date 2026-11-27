---
date: 2026-10-29
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#238'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-push]
time-to-detect: one CI run
tags: [coverage, vitest, pre-push, gates, ci, pragma]
zone: apps/pragma/api/src/calendar-feeds/calendar-feeds.schema.ts
recurs: [a-green-mutation-gate-is-not-a-green-coverage-gate]
---

# The coverage gate a wrong comment kept in CI

## User impact

The operator's PR #238 went red on its first CI run, after the push hook had
passed the same tree.

| | Seen | Expected |
| --- | --- | --- |
| Push of `2e5aed5b` | pre-push green | pre-push red on the uncovered file |
| CI, pragma job, step *Pure suites and the per-file coverage gate* ([run 40918532741](https://github.com/hugoleborso/borso.fr/actions/runs/40918532741)) | failed: `calendar-feeds.schema.ts` at 75 % of lines and 0 % of functions under a 100 % per-file threshold (measured by CI) | green, because the push already proved coverage |

The cost was one red run and one fix push, `7550244b`. Only this pull request
was affected.

## Causal chain

- CI failed the per-file coverage gate on `calendar-feeds.schema.ts`.
  - The core suite never ran the callback that declares `calendar_feed`'s two
    indexes.
    - Drizzle calls a table's third argument only when something reads the
      table's config. The schema test only parsed the request body.
      - Commit `1f8c003e9` added the callback and left the schema test, written
        in #118 for a table with no callback, untouched:

        ```ts
        (table) => [
          index('calendar_feed_member_id_idx').on(table.memberId),
          uniqueIndex('calendar_feed_member_id_address_unique').on(table.memberId, table.address),
        ], // ← no test reads getTableConfig, so this function never runs
        ```

        - The file says `// @FollowsBlueprint schema-table-and-input`. That
          blueprint, `apps/pragma/api/src/bars/bars.schema.ts`, declares a
          table with no third argument, and `bars.schema.test.ts` reads no
          table config. The example the agent copied had no index to cover
          (Material).

## Root cause of occurrence

*Thought a schema test that parses the request body covers the schema file,
actually Drizzle runs the index callback only when something reads
`getTableConfig`.* (Material)

The agent wrote the table from the blueprint the file names. That
blueprint has no callback, so it carries no test for one. The right pattern
existed in the same app: `oauth.schema.test.ts`, from #206, reads the indexes
back through `getTableConfig`, and the fix commit `7550244b` says it copied
it. No blueprint marks a schema test (`grep -rn "@Blueprint"
apps/*/api/src --include='*.schema.test.ts'` finds none), so nothing brought
that file into the agent's context (inferred).

## Detection failure causes

- **Pre-push:** `.husky/pre-push` ran the changed tests with
  `--changed <base>` and no `--coverage`. Its comment, from `9fc3b9a4`, said
  why: "A per-file threshold needs the whole suite that covers those files, so
  running it over a changed-only selection would report every untouched pure
  file at 0 %." That is false. Vitest's `coverage.changed` follows
  `--changed`, so a run with both flags measures only the changed files the
  include names, and `--changed` already selects every test that imports
  them.
- **Local validation:** the implementation skill and the technical validator
  repeated the comment as "coverage is CI's", so neither ran it.

## Countermeasure

Commit `7550244b` reads the two indexes back through `getTableConfig`, as
`oauth.schema.test.ts` does. The file reaches 100 %.

## Eradication

**Type:** DevX check (level 2). The push hook now refuses an app's uncovered
changed file.

**Reference:** the commit adding this file, in [PR #238](https://github.com/hugoleborso/borso.fr/pull/238).

```diff
-      pnpm --filter "@borso-app/$app" exec vitest run --project core --changed "$push_base"
+      pnpm --filter "@borso-app/$app" exec vitest run --project core --changed "$push_base" --coverage
```

No new run starts. The comment now says what Vitest does. The
technical-validation standard, the validator agent and the implementation
skill run the same flag.

**Proof it can fail:** PR #238's schema test from `2e5aed5b` put back, one
line appended to the schema so `--changed HEAD` selects it, then the hook's
command in `apps/pragma`:

```text
ERROR: Coverage for lines (80%) does not meet global threshold (100%) for api/src/calendar-feeds/calendar-feeds.schema.ts
ERROR: Coverage for functions (0%) does not meet global threshold (100%) for api/src/calendar-feeds/calendar-feeds.schema.ts
```

It exited 1. With `7550244b`'s test it exited 0. Cost, measured in
`apps/pragma` over 86 test files: 66 s without coverage, 79 s with it.

**Similar instances:** `sed -n 295,313p .husky/pre-push` shows the
`infra-cdk`, `infra-shared` and `tooling` runs still without `--coverage`,
under the same "runs in CI" comment. Their configs gate 100 % per file
(`grep -n perFile infra/*/vitest.config.ts vitest.config.ts`). The level above
holds for the apps only.

**Proposed:** add `--coverage` to those three runs in `.husky/pre-push`, so
no 100 %-gated package can pass the push and fail CI's coverage step. Mark a
schema test that reads `getTableConfig`, such as
`apps/pragma/api/src/oauth/oauth.schema.test.ts`, as a `@Blueprint`, and add
an index callback to the `schema-table-and-input` example or point it at that
test. The next table with indexes then copies a test that runs its callback.
