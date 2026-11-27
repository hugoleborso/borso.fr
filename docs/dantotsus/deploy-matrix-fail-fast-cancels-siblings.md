---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#12'
fix-commits: [cd3aab2b31]
eradication-level: 5
eradication-paths: [.github/workflows/deploy.yml]
time-to-detect: minutes
tags: [github-actions, ci, deploy]
zone: .github/workflows/deploy.yml
---

# Deploy matrix cancelled `last-loop-lepin` because `borsouvertures` failed first

## User impact

PR #12 merged and `deploy.yml` ran on `main` with two apps to ship to
production. `borsouvertures` failed. `last-loop-lepin` was cancelled
before it started, so its merged change never reached production.

| | Seen | Expected |
| --- | --- | --- |
| `last-loop-lepin` deploy job | cancelled while queued | runs and deploys, whatever `borsouvertures` did |

The operator reported it: *"comme le deploy de borsouvertures a fail,
celui de last loop lepin n'a pas commencé"* (since the borsouvertures
deploy failed, the last-loop-lepin one never started).

## Causal chain

- The `last-loop-lepin` matrix entry was cancelled while queued.
  - The `borsouvertures` entry failed, and GitHub cancelled every entry of the same matrix that had not finished.
    - The deploy matrix left `fail-fast` unset, and GitHub's default is `true`. `max-parallel: 1` had queued `last-loop-lepin` behind `borsouvertures`.

      ```yaml
      # deploy.yml at 56258c2b0
      strategy:
        matrix:
          app: ${{ fromJson(needs.detect.outputs.apps) }}
        max-parallel: 1   # ← serialises; fail-fast stays true
      ```

      - Commit 56258c2b0 (2026-05-02) wrote it. Its header comment explains `max-parallel: 1` as a way to "avoid simultaneous CFN updates touching shared zone records".
        - The same commit set `fail-fast: false` on the matrix of `preview.yml` (measured, `git show 56258c2b0 | grep -n fail-fast`). The writer knew the setting and applied it to one of the two matrices.

## Root cause of occurrence

*Thought `max-parallel: 1` gives each app its own turn, so one app's
failure stays its own, actually it only orders the entries, and the
default `fail-fast: true` still cancels every entry queued behind a
failure.*

Tag: **Man** (agentic rule). The setting was in the writer's hands: the
same commit uses it in `preview.yml`. The serialisation framing won over
it in `deploy.yml`. Below it sits a Machine condition: GitHub defaults
`fail-fast` to `true`, so every matrix must opt out by hand.

## Detection failure causes

- **Linter:** `actionlint` runs in `.husky/pre-push`, but it checks syntax and expressions, not whether a matrix keeps the default `fail-fast`.
- **Local run:** previews run in `preview.yml`, whose matrix already had `fail-fast: false`. The production matrix only runs on a merge to `main`.
- **Review:** the comment on `max-parallel: 1` framed the strategy as safety serialisation, so the missing line read as intended.

## Countermeasure

Commit cd3aab2b31 set `strategy.fail-fast: false` on the deploy matrix.
Each app's deploy now runs to its own end. `max-parallel: 1` was later
removed in c54e32da7, and the `fail-fast` line stayed.

## Eradication

**Type:** knowledge (level 5).

**Reference:** commit [`cd3aab2b31`](https://github.com/hugoleborso/borso.fr/commit/cd3aab2b31).

```diff
     strategy:
+      fail-fast: false
       matrix:
         app: ${{ fromJson(needs.detect.outputs.apps) }}
```

What holds today is four lines set by hand and a comment at
`.github/workflows/deploy.yml:18`. Every matrix opts out:
`ci.yml:280`, `deploy.yml:113`, `full-suite.yml:57` and `preview.yml:148`
(measured, `grep -n fail-fast .github/workflows/*.yml`). Nothing refuses a
new matrix that forgets. The setting fixes this instance, and the class
rests on the writer remembering, so the level is the floor.

**Proof it can fail:** none, since no check exists.

**Proposed:** a check in `.husky/pre-push`, beside `actionlint`, that
parses each file under `.github/workflows/` and refuses any
`strategy.matrix` with no explicit `fail-fast` key. A workflow could then
never inherit GitHub's default by omission, and a matrix that wants
fail-fast would say so on its own line.

**Similar instances:** `grep -n "matrix:" .github/workflows/*.yml` finds
the four matrices above. The original entry said previews use no matrix.
That was wrong: `preview.yml` has had one since 56258c2b0, with
`fail-fast: false`.
