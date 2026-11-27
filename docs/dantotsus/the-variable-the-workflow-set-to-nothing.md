---
date: 2026-10-29
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#163'
fix-commits: [self]
eradication-level: 4
eradication-paths: [.github/workflows/deploy.yml]
time-to-detect: 17 days
tags: [vite, observability, ci, github-actions, gates, pragma]
zone: .github/workflows/deploy.yml
weak-point: gate-measures-nothing
recurs: [a-feature-that-was-never-switched-on-in-any-stage]
---

# The variable the workflow set to nothing

## User impact

PR #163 shipped Sentry for pragma on 2026-10-12. For 17 days, no error from
pragma's production site or API reached Sentry, and no gate, log or page said
that reporting was off. PR #235 found it on 2026-10-29 while switching Sentry
on (measured by #235's session).

| | Seen | Expected |
| --- | --- | --- |
| A pragma user hits a crash in prod | Nothing in Sentry | An event in Sentry, tagged `app: pragma` |
| The operator reads the deploy run | Green, no word about Sentry | Green with Sentry on, or a refusal saying it is off |

## Causal chain

- Prod pragma sent no event to Sentry for 17 days.
  - The bundle was built with an empty `VITE_SENTRY_DSN`, and the Lambda got
    an empty `PRAGMA_SENTRY_DSN`. Both sides read an empty DSN as "no
    project", the designed off switch for local runs.
    - The deploy workflow set the variable from a repository variable nobody
      had created. GitHub Actions evaluates a missing `vars.X` to `''`, with
      no warning. The faulty line, from #163 (`6385b5727`):

      ```yaml
      # Empty unless the repository variable exists, and it did not.
      VITE_SENTRY_DSN: ${{ matrix.app == 'pragma' && vars.PRAGMA_SENTRY_DSN || '' }}
      ```

      - #163's session shipped the line knowing it was dormant. Its commit
        says so: "nothing changes until the operator creates the project".
        - The operator step to create the variable was written only in that
          commit message. No queue of operator tasks existed then.
          `docs/operator-backlog/` first appeared on 2026-11-15 (`9b8d380ed`),
          a month later. **Method.**
      - The same commit removed the one visible flag. Its message says
        "VITE_SENTRY_DSN is now set by both deploy workflows, so its entry in
        check-frontend-env-vars.sh is removed". An empty string reads the
        same as "off on purpose" for last-loop-lepin and "not configured yet"
        for pragma, so removing the entry looked safe. **Machine.**

## Root cause of occurrence

*Thought a dormant DSN is safe because the commit message tells the operator
what to create, actually a step written only in a commit message reaches no
queue the operator works from, and an empty value cannot tell "not set up
yet" from "off on purpose".* **Method**, with a Machine branch.

The agent that wrote #163 knew the API. The same commit says the SDK stays off
"unless a DSN is configured". The missing piece was the handover. The repo had
no place where an operator step waited until done, and the value gave no
signal of its own.

## Detection failure causes

- **Typing:** `string | undefined` models absence correctly, so an empty DSN
  is a valid value and raises nothing.
- **Linter / static analysis:** `scripts/check-frontend-env-vars.sh` compares
  the `VITE_*` names a site reads with the names the workflows mention. A
  workflow that maps the name to an undefined `vars.X` mentions it. A
  variable's value lives in GitHub settings, which no static gate reads.
  actionlint accepts any `vars.X`.
- **CI:** the build succeeds with an empty DSN, by design.
- **Code review:** #163's review saw the variable mapped in both workflows.
  Whether `PRAGMA_SENTRY_DSN` existed is a question about settings, which a
  diff does not show.
- **Monitoring:** the missing thing was the monitoring itself.

## Countermeasure

PR #235 (squash `85a613429`) reads the DSN, org and project from variables of
the prod environment and tags every event `app: pragma`. The operator created
`SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` and the `SENTRY_AUTH_TOKEN`
secret in the prod environment (#235's *Before merge*). Measured on
2026-10-29: the live bundle at
`https://pragma.borso.fr/assets/index-O6uXEC1p.js` carried an
`ingest.de.sentry.io` DSN.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`53c0d307c`](https://github.com/hugoleborso/borso.fr/commit/53c0d307c)
added the step for pragma. #263 (`cb33e10d8`) dropped its `if: matrix.app ==
'pragma'`, so it now runs for every app. What holds today, in
`.github/workflows/deploy.yml`:

```yaml
- name: Refuse to deploy with Sentry off
  run: |
    if [ -z "$VITE_SENTRY_DSN" ]; then
      echo "::error::vars.SENTRY_DSN is empty in the prod environment, so ${{ matrix.app }} would deploy with Sentry off. Set it, or delete this step and say why in the commit."
      exit 1
    fi
```

The step runs where the value exists, before anything is built. Turning
Sentry off in prod now takes a commit that deletes the step, which is a
reviewable decision. Previews stay off on purpose, because the preview job
names no environment.

The Method branch is held by `docs/operator-backlog/`, where CLAUDE.md now
asks every operator step to land in the pull request that found it. That is
a written rule (level 5), so the deploy gate is what holds when it is missed.

**Proof it can fail:** the step's script, extracted and run both ways.

```text
$ VITE_SENTRY_DSN= bash gate.sh
::error::vars.SENTRY_DSN is empty in the prod environment, so pragma would deploy with Sentry off. Set it, or delete this step and say why in the commit.
exit 1
$ VITE_SENTRY_DSN=https://k@o1.ingest.de.sentry.io/1 bash gate.sh
exit 0
```

**Proposed:** the gate checks only `VITE_SENTRY_DSN`. `SENTRY_ORG`,
`SENTRY_PROJECT` and pragma's `SENTRY_AUTH_TOKEN` also read as `''` when
missing, and `apps/pragma/cdk/bin/cdk.ts` then skips the source-map upload
without a word. Extending the same step to refuse an empty value for every
Sentry variable or secret the job reads would cover the class "a missing
`vars.X` reads as empty", not one name.

**Similar instances:** `grep -n "vars\.\|secrets\." .github/workflows/deploy.yml`
lists the values the job reads. `SENTRY_ORG`, `SENTRY_PROJECT` and
`SENTRY_AUTH_TOKEN` are unguarded, as above. last-loop-lepin, which the first
version of this entry called off by choice, is now gated like every app since
#263.
