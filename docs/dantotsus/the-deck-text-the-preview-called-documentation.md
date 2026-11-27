---
date: 2026-11-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#340'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/dependencies/check-only-change.core.ts, scripts/dependencies/check-only-change.core.test.ts, scripts/pr/deploy-fanout.core.ts, scripts/pr/deploy-fanout.ts, .github/workflows/deploy.yml]
time-to-detect: hours
tags: [ci, github-actions, deploy, borsouvertures]
zone: scripts/dependencies/check-only-change.core.ts
recurs: [a-lint-script-redeployed-every-app]
---

# The deck text the preview called documentation

## User impact

PR #340 taught the preview to skip an app whose every change is a test, a
markdown file or a test config. borsouvertures builds its decks from
`content/decks/<deck>/ideas.en.md` and `ideas.fr.md`. A pull request that
rewrote only a deck's ideas would have opened with no preview, and the operator
validates on the preview. No such pull request ran in the hour the rule was
live (inferred from the merge log).

The merge of PR #352 showed the other half. It changed six READMEs under
`apps/`, and production redeployed five apps with identical builds.

| | Seen | Expected |
| --- | --- | --- |
| A pull request changing only `ideas.en.md` | `drop-check-only-changes.ts --tooling` printed `[]`, so no preview (measured on a scratch commit) | a borsouvertures preview |
| The merge of #352, README-only | `deploy-fanout.ts` printed five apps, and run 43688275001 deployed them (read) | no application |

## Causal chain

- The preview would skip deck text.
  - `drop-check-only-changes.ts --tooling` classed `ideas.en.md` as tooling.
    - Commit `cdc543725` (#340) widened the preview's rule with a suffix:

      ```ts
      /(\.test\.tsx?|\.md|\/stryker\.config\.js|\/vitest(\.[a-z]+)?\.config\.ts)$/
      //             ^^^^ ← a suffix, not a role
      ```

      - The repository holds no record of which files a build reads. Its
        rules guess a file's role from its name (Machine).
- Production redeployed five apps for READMEs.
  - `deploy.yml` kept the narrower check-only rule, and `deploy-fanout.ts`
    counted every path under `apps/<app>/`.
    - The same commit widened only the preview's rule. Its message says
      "Production deploys keep the narrower check-only rule", with no reason.

## Root cause of occurrence

*Thought a markdown file under an app is documentation, actually one app builds
its content from markdown.* (Machine)

`apps/borsouvertures/scripts/decks/deck-folders.adapter.ts` reads
`readText(decksRoot, folderName, 'ideas.en.md')`, and the app's `build` script
runs `build-decks.setup.ts` before `vite build`. Nothing near the rule says
so. A rule that must name what is inert has only the path to go on, so a
suffix looked like enough.

## Detection failure causes

- **Tests:** `isToolingFile` was tested with `VOCABULARY.md` and `notes.mdx`
  only. No case named a markdown file a build reads.
- **Review:** the commit stated the preview and the merge differ, without a
  reason, so nobody asked why.

## Countermeasure

A markdown file is tooling only when its name is upper case, the repository's
convention for documents (`README.md`, `VOCABULARY.md`, `DESIGN.md`).
Lower-case markdown, such as deck ideas, counts as source. `deploy.yml` runs
the same `--tooling` rule on every key, and `deploy-fanout.ts` predicts with
it.

## Eradication

**Type:** detection (level 4). One predicate now serves the preview, the merge
and the prediction, so those three cannot disagree again (structural). Which
markdown is inert is still a naming convention. A unit test pins the deck
ideas as source, and nothing catches a build that reads an upper-case
markdown file.

**Reference:** PR #356 · the commit adding this file.

```diff
 const TOOLING_FILE_PATTERN =
-  /(\.test\.tsx?|\.md|\/stryker\.config\.js|\/vitest(\.[a-z]+)?\.config\.ts)$/;
+  /(\.test\.tsx?|\/[A-Z][A-Z0-9_-]*\.md|\/stryker\.config\.js|\/vitest(\.[a-z]+)?\.config\.ts)$/;
```

```diff
-          if jq -e 'index("deps")' <<<"$CHANGES" >/dev/null; then
-            if kept=$(pnpm exec tsx scripts/dependencies/drop-check-only-changes.ts \
-              "$BASE" "$CHANGES"); then
+          if kept=$(pnpm exec tsx scripts/dependencies/drop-check-only-changes.ts \
+            "$BASE" "$CHANGES" --tooling); then
```

`decideDeployFanout` takes the same `isToolingOnlyChange` predicate, and
`pnpm exec tsx scripts/pr/deploy-fanout.ts 8230bce^ 8230bce` prints
`none — no application path changed.`

**Proof it can fail:** on a scratch commit changing
`apps/borsouvertures/content/decks/vienna-game/ideas.en.md` and
`apps/pragma/README.md`, the old rule printed `[]` and the new one prints
`["borsouvertures"]`. `check-only-change.core.test.ts:143` expects
`ideas.en.md` to be source and fails against the old pattern.

**Similar instances:** `git ls-files 'apps/**/*.md' | grep -v '/[A-Z][A-Z0-9_-]*\.md$'`
lists only the deck ideas. `grep -rn "\.md['\"]" apps` finds no other build
reading markdown.

**Proposed:** add a test in `check-only-change.core.test.ts` that lists
`git ls-files 'apps/**/*.md'` and fails when a file `isToolingFile` accepts is
named in any non-test source under `apps/`. The search the sweep ran by hand
then runs on every commit, and a build cannot read a file the deploy rule
skips without a red test.
