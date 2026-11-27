---
date: 2026-08-20
introduced-at: conception
detected-at: ci
severity: high
related-pr: '#49'
fix-commits: [a9e0d1be4e]
eradication-level: 4
eradication-paths: [.github/workflows/full-suite.yml]
time-to-detect: days
tags: [ci, gates, github-actions, testing, process]
zone: .github/workflows/full-suite.yml
weak-point: gate-measures-nothing
---

# The backstop nobody was standing behind

## User impact

The operator relied on `full-suite`, the only unscoped run of every suite, to catch what the scoped gates skip. It went red and nobody knew.

| | Seen | Expected |
| --- | --- | --- |
| `full-suite` on `main`, from 2026-08-16 | 20 consecutive red runs over four days, across nine merged pull requests (measured in the Actions list) | The first red run reaching whoever merged, before the next merge |
| How it was found | Someone opened the Actions list for another reason while merging a Dependabot queue | An alert |

The regression it was reporting the whole time shipped to `main` unblocked. It is [`the-mutants-were-judged-by-the-wrong-jury.md`](./the-mutants-were-judged-by-the-wrong-jury.md).

## Causal chain

- Twenty red runs went unseen.
  - Each push to `main` started a fresh run, and the red one before it scrolled into history.
  - A red run posted nowhere a person looked. The workflow ran only after the merge, never as a pull request check, and sent no notification.
    - `9fc3b9a40` moved the suite there to keep pre-push fast, with this header:

      ```yaml
      # This workflow is that hole's backstop. It runs after the
      # merge, on main, where nobody is waiting on it.   ← the faulty design
      ```

      - The same commit scoped pre-push and `ci` to the files and apps a change touches, and named this run as the backstop that made scoping safe (Method).

## Root cause of occurrence

*Thought a gate that fails is a gate that is heard. Actually a gate whose only audience is a workflow list nobody opens is a log file, and the justification for scoping the cheap gates rested on it.* (Method)

The agent that wrote `9fc3b9a40` gave "nobody is waiting on it" as the reason the run could afford to be slow. On a pull request a red run is loud because it sits above the merge button. On `main` no such surface exists. Source: the header of `.github/workflows/full-suite.yml`, unchanged today, lines 1 to 8.

## Detection failure causes

- **Local validation:** pre-push runs no unscoped suite by design, and says the unscoped run exists elsewhere. It did exist, and was red.
- **CI:** the run itself detected the defect correctly. Nothing carried its verdict to a person.
- **Review:** the reporting gap is an absence, not a line, so no diff of the workflow shows it.
- **Monitoring:** no alert was configured for Actions failures on `main`.

## Countermeasure

`a9e0d1b` added a `report-failure` job, guarded by `if: failure()`, that posts a commit comment on the failing commit. The comment lands on the commit page and in the merge author's GitHub notifications. Green runs stay silent.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`a9e0d1b`](https://github.com/hugoleborso/borso.fr/commit/a9e0d1be4e).

```diff
+  report-failure:
+    needs: [app, infra]
+    if: failure()
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/github-script@v9
+        with:
+          script: |
+            await github.rest.repos.createCommitComment({ … })
```

This still holds (read today, `full-suite.yml:193-202`). It makes a red backstop audible. It does not stop the next merge, so a second and third merge can still land on a red `main` if the notification is missed.

The first version said level 1 needed branch protection, which this repository cannot observe. A required check is not the only way to block.

**Proposed:** add a step to `ci.yml` that reads the conclusion of the latest completed `full-suite` run on `main` through the GitHub API and fails the pull request while it is red. `ci.yml` would need `actions: read` beside its `contents: read`. One tradeoff needs a decision. The pull request that fixes `main` is also blocked. The step can let it through by running the unscoped suite on that pull request instead of failing it. A red backstop then stops the next merge, without branch protection.

**Proof it can fail:** not replanted this session. The job fires on `failure()` of `app` or `infra`, which the twenty red runs above would each have triggered.

**Similar instances:** `grep -ln "branches: \[main\]" .github/workflows/*.yml` finds `deploy.yml` and `wiki.yml` running on `main` besides this one (and `ci.yml`, whose match is its pull request trigger). `grep -c "if: failure()"` finds no failure report in either. [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md) is the previous time this repository believed in a protection that was not there.
