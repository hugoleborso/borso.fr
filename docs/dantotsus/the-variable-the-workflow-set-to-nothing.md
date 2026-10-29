---
date: 2026-10-29
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#163'
fix-pr: '#235'
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

## Symptom

PR #163 shipped Sentry for pragma on 2026-10-12. The site and the API both
started the SDK whenever a DSN was configured. For 17 days no event reached
Sentry from production, and no gate, log or page said that reporting was off.
PR #235 found it on 2026-10-29 while switching Sentry on, and the operator set
the DSN in the prod environment.

The workflow did set the variable. It set it to this:

```yaml
VITE_SENTRY_DSN: ${{ matrix.app == 'pragma' && vars.PRAGMA_SENTRY_DSN || '' }}
```

`PRAGMA_SENTRY_DSN` did not exist as a repository variable. GitHub Actions
evaluates a missing `vars.X` to an empty string, with no warning.

## Root-cause chain

1. **Why did prod send nothing?** The bundle was built with an empty
   `VITE_SENTRY_DSN`, and the Lambda got an empty `PRAGMA_SENTRY_DSN`. Both
   sides treat an empty DSN as no project, which is the designed off switch
   for local runs and the other apps.
2. **Why was the DSN empty?** The workflow read `vars.PRAGMA_SENTRY_DSN`, which
   nobody had created. #163's commit says so on purpose: "nothing changes
   until the operator creates the project".
3. **Why did nothing report the off state?** The earlier entry,
   [a-feature-that-was-never-switched-on-in-any-stage](./a-feature-that-was-never-switched-on-in-any-stage.md),
   made it visible with an `ALLOWED_UNSET` line in
   `scripts/check-frontend-env-vars.sh`. #163 removed that line, because the
   workflow now named `VITE_SENTRY_DSN`, and the check passed.
4. **Why did the check pass?** It compares the `VITE_*` names a site reads
   with the names the workflows mention. A workflow that maps the name to an
   undefined `vars.X` mentions it. The check can only see text, and the value
   exists only when the job runs, inside the `prod` environment.

**Root cause:** thought *a workflow that sets `VITE_SENTRY_DSN` switches
Sentry on*, actually *it sets it to whatever `vars.X` holds at run time, and a
missing `vars.X` is an empty string*, so the only place that can tell on from
off is the deploy job itself.

## Detection failure causes

- **Typing:** `string | undefined` models absence correctly, which is what
  makes it silent.
- **Linter / static analysis:** `check-frontend-env-vars.sh` reads names. A
  variable's value lives in GitHub settings, which no static gate reads.
  actionlint accepts any `vars.X`.
- **CI (tests / build):** the build succeeds with an empty DSN, by design.
- **Code review:** #163's review saw the variable mapped in both workflows.
  Whether `PRAGMA_SENTRY_DSN` existed is a question about settings, which a
  diff does not show.
- **Production monitoring / alerting:** the missing thing was the monitoring.

## Countermeasure

- **Code:** PR #235 (squash `85a61342`) reads the DSN, org and project from
  variables of the prod environment and tags every event `app: pragma`.
- **Operator action:** the operator created `SENTRY_DSN`, `SENTRY_ORG`,
  `SENTRY_PROJECT` and the `SENTRY_AUTH_TOKEN` secret in the prod environment
  (#235's *Before merge*). Measured on 2026-10-29: the live bundle at
  `https://pragma.borso.fr/assets/index-O6uXEC1p.js` carries an
  `ingest.de.sentry.io` DSN.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — the deploy job refuses an off state)

**Reference:** this kaizen PR's commit, in `.github/workflows/deploy.yml`.

**The actual fix:** the first step of the prod deploy job, for pragma only,
fails when the DSN it is about to build with is empty. It runs where the value
exists, before anything is built or deployed.

```diff
     steps:
+      - name: Refuse to deploy pragma with Sentry off
+        if: matrix.app == 'pragma'
+        run: |
+          if [ -z "$VITE_SENTRY_DSN" ]; then
+            echo "::error::vars.SENTRY_DSN is empty in the prod environment, so pragma would deploy with Sentry off. Set it, or delete this step and say why in the commit."
+            exit 1
+          fi
       - uses: actions/checkout@v7
```

Proven both ways on the step's own script, extracted from the workflow:

```text
$ VITE_SENTRY_DSN= bash gate.sh
::error::vars.SENTRY_DSN is empty in the prod environment, so pragma would deploy with Sentry off. Set it, or delete this step and say why in the commit.
exit 1
$ VITE_SENTRY_DSN=https://k@o1.ingest.de.sentry.io/1 bash gate.sh
exit 0
```

Turning Sentry off in prod is still possible. It now takes a commit that
deletes the step, which is the reviewable decision the `ALLOWED_UNSET` line
used to be.

The check is not extended to previews. The preview job names no environment,
so the prod variables read as empty there and previews run with Sentry off on
purpose. The same commit corrects `preview.yml`'s comment, which still said the
DSN was a repository variable.

**Sibling defects swept:** `last-loop-lepin` reads `VITE_SENTRY_DSN` too and
both workflows set it to `''` for every app but pragma. That is off by an
explicit choice in the workflow text, not by a missing variable, so it needs
no gate.

## See also

- [a-feature-that-was-never-switched-on-in-any-stage](./a-feature-that-was-never-switched-on-in-any-stage.md),
  the same off switch before any workflow named the variable.
- [the-connection-parameter-no-mock-could-refuse](./the-connection-parameter-no-mock-could-refuse.md),
  another property that only the deploy job can check.
- `docs/adr/0031-pragma-reports-errors-and-traces-to-sentry-eu.md`
