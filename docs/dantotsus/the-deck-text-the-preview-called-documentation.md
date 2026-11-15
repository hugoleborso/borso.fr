---
date: 2026-11-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#340'
fix-pr: '#353'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/dependencies/check-only-change.core.ts, scripts/pr/deploy-fanout.core.ts, scripts/pr/deploy-fanout.ts, .github/workflows/deploy.yml]
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
rewrote only a deck's ideas would have opened with no preview, and the
operator validates on the preview. No such pull request ran in the hour the
rule was live (inferred from the merge log).

The merge of PR #352 showed the other half. It changed six READMEs under
`apps/`, and production redeployed five apps with identical builds, because
`deploy.yml` kept the narrower check-only rule and `deploy-fanout.ts` counted
every path under `apps/<app>/`.

| | Seen | Expected |
| --- | --- | --- |
| A pull request changing only `ideas.en.md` | `drop-check-only-changes.ts --tooling` printed `[]`, so no preview (measured on a scratch commit) | a borsouvertures preview |
| The merge of #352, README-only | `deploy-fanout.ts` printed five apps, and run 43688275001 deployed them (read) | no application |

## Causal chain

- The preview would skip deck text, and production redeployed five apps for READMEs.
  - The preview and the merge used two rules for "changes nothing a deploy runs".
    - PR #340 widened only the preview's rule and left `deploy.yml` and `deploy-fanout.ts` on the old one.
  - The wider rule matched every `.md`.
    - `TOOLING_FILE_PATTERN` ended in `\.md`, a suffix and not a role.

## Root cause of occurrence

*Thought a markdown file under an app is documentation, actually one app
builds content from markdown.*

`apps/borsouvertures/scripts/decks/deck-folders.adapter.ts` reads
`readText(decksRoot, folderName, 'ideas.en.md')`, and the app's `build`
script runs `build-decks.setup.ts` before `vite build`.

## Detection failure causes

- **Tests:** `isToolingFile` was tested with `VOCABULARY.md` and `notes.mdx`
  only. No case named a markdown file a build reads.
- **Review:** #340's commit said "Production deploys keep the narrower
  check-only rule" without a reason, so nobody asked why the two differed.

## Countermeasure

A markdown file is tooling only when its name is upper case, the repository's
convention for documents (`README.md`, `VOCABULARY.md`, `DESIGN.md`,
`THIRD_PARTY_NOTICES.md`). Lower-case markdown, such as deck ideas, counts
as source. `deploy.yml` now runs the same `--tooling` rule on every key, and
`deploy-fanout.ts` predicts with it, so the preview, the merge and the
prediction agree.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** PR #353 · the commit adding this file

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
`pnpm exec tsx scripts/pr/deploy-fanout.ts 8230bce^ 8230bce` now prints
`none — no application path changed.`

**Proof it can fail:** on a scratch commit changing
`apps/borsouvertures/content/decks/vienna-game/ideas.en.md` and
`apps/pragma/README.md`, the old rule printed `[]` and the new one prints
`["borsouvertures"]`. The test case for `ideas.en.md` fails against the old
pattern.

**Similar instances:** `git ls-files 'apps/**/*.md'` lists the deck ideas as
the only lower-case markdown, and `grep -rn "\.md['\"]" apps` finds no other
build reading markdown.
