---
date: 2026-11-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#340'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/deploy/synthesized-output.core.ts, scripts/deploy/synthesized-output.ts, scripts/deploy/apps-whose-output-changed.ts, .github/workflows/deploy.yml, .github/workflows/preview.yml]
time-to-detect: hours
tags: [ci, github-actions, deploy, borsouvertures]
zone: .github/workflows/preview.yml
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

**Reference:** PR #356 narrowed `TOOLING_FILE_PATTERN` to upper-case markdown.
The commit adding this paragraph deleted the pattern: no file is classified by
its name any more.

The preview and the merge now keep an app when its synthesized output differs
from the base, read by `scripts/deploy/apps-whose-output-changed.ts`.
borsouvertures builds its decks from `ideas.en.md` during `pnpm build`
(`scripts/decks/deck-folders.adapter.ts`), so a rewritten deck changes the
site asset hash in the template and the app is kept, whatever the file is
called (inferred from the build, not replayed). A README changes no asset and is dropped.
The same comparison backs `scripts/pr/deploy-fanout.ts`.

**Proof it can fail:** a translation string changed in
`apps/pragma/site/src/i18n/en.json` made the script print `["pragma"]`, and a
README line, a test edit, a `lint` script and a dev dependency in the same app
printed `[]` (measured 2026-11-27).
