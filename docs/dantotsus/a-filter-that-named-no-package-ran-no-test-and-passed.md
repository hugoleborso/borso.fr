---
date: 2026-11-14
introduced-at: code-review
detected-at: review
severity: medium
related-pr: '#321'
fix-pr: none (opened by the kaizen pull request for #321)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.npmrc]
time-to-detect: minutes
tags: [pnpm, gates, tooling, agents]
zone: .npmrc
weak-point: gate-measures-nothing
recurs: none (the first green from a package filter; the-check-that-passed-on-an-empty-directory, from the sweep of PR #327, is the same shape for a shell gate run from the wrong directory)
---

# A filter that named no package ran no test and passed

## User impact

The technical validator of PR #321, round 2, ran the shared infra tests by a
package name that does not exist:

```text
[technical-validation-02] pnpm --filter @borso/shared matches no workspace (the package is @borso/shared-infra) and exits 0 with no test run, so a wrong filter name reads as a green run.
```

Reproduced this session, before the change:

| | Seen | Expected |
| --- | --- | --- |
| `pnpm --filter @borso/shared test` | exit 0, "No projects matched the filters" | a failure, because nothing was tested |
| `pnpm --filter @borso/nonexistent test` | exit 0 (measured) | exit 1 |

The validator noticed this time, because it read the output. A report that
cites only the exit status would have recorded a pass for tests that never ran.

## Causal chain

- A review cited a green run of tests that never ran.
  - `pnpm --filter <name> <script>` with a name no package has prints a notice
    and exits 0.
    - pnpm's default for `fail-if-no-match` is false, and `.npmrc` did not set
      it.

## Root cause of occurrence

*Thought a filter that matches nothing is an error, actually pnpm treats it as
an empty selection.*

`pnpm help run` in pnpm 10.0.0 documents the flag: "--fail-if-no-match. If no
projects are matched by the command, exit with exit code 1 (fail)". Without
it, the exit is 0 (measured). The same setting is read from `.npmrc` and from
`npm_config_fail_if_no_match` (measured this session with both forms).

## Detection failure causes

- **Agent:** the exit status is what every brief cites. Nothing in the run
  except one notice line said zero packages ran.
- **Repository:** every filter in `.husky`, `scripts/*.sh` and the workflows
  names a package that exists, or `./apps/*`, which always matches. So no gate
  ever printed the notice, and nothing tested the empty case.

## Countermeasure

Set `fail-if-no-match=true` in `.npmrc`. Every call site was checked first:
`grep -rhn -- '--filter [^ ]*' .husky scripts/*.sh .github/workflows/*.yml`
lists only `./apps/*`, `@borso-app/<app>` with an app taken from a changed
path, `@borso/infra` and `@borso/shared-infra`. None can match nothing in a
normal run.

## Eradication

**Type:** structural impossibility (level 1). A filter that selects no package
can no longer exit 0.

**Reference:** this kaizen pull request · commit `self`

```diff
 save-exact=true
 auto-install-peers=true
+fail-if-no-match=true
```

**Proof it can fail:**

```text
$ pnpm --filter @borso/shared test; echo $?
No projects matched the filters in "/home/user/borso.fr"
1
$ pnpm --filter @borso/shared-infra exec true; echo $?
0
$ pnpm ls -r --depth -1 --filter "./apps/*" --json >/dev/null; echo $?
0
```

**Similar instances:** the same false green from a shell gate run in the wrong
directory is eradicated by the sweep of PR #327 (`the-check-that-passed-on-an-empty-directory`).
Both sit under the `gate-measures-nothing` weak point.
