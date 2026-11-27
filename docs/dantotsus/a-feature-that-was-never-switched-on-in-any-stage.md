---
date: 2026-08-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#33'
fix-commits: [882ab2bf51, 647e2148f, cb33e10d8]
eradication-level: 4
eradication-paths: [scripts/check-frontend-env-vars.sh, .github/workflows/deploy.yml]
time-to-detect: months
tags: [vite, observability, ci, github-actions, gates, process]
zone: .github/workflows/deploy.yml
blueprints: [observability-adapter]
---

# A feature nobody switched on, in any stage, for months

## User impact

The operator was the user. From May to August, no error from any last-loop-lepin visitor reached Sentry, in dev, in preview or in production. `@sentry/react` shipped to every visitor, `initSentry()` ran from `main.tsx`, and three components recorded breadcrumbs. Not one event ever left a browser. The operator asked, on `site/src/observability/sentry.ts`:

> *We have sentry ? Where ?*

| | Seen | Expected |
| --- | --- | --- |
| A runtime error in production | Nothing in Sentry, and nothing saying reporting was off | An event in Sentry, as the ratified `race-day-live` spec chose "(a) Sentry frontend + 4 events analytics" |

## Causal chain

- No event ever reached Sentry from any stage.
  - `initSentry()` returned before `Sentry.init`, every time.

    ```ts
    export function initSentry(): void {
      const dsn = readSentryDsn();
      if (dsn === undefined) return;   // ❌ taken, always, everywhere
      Sentry.init({ … });
    }
    ```

    - `readSentryDsn()` returned `undefined`. Vite inlines `import.meta.env.VITE_SENTRY_DSN` at build time and substitutes `undefined` when the variable is absent, and no workflow, CDK stack or entry point set it (measured then with `grep -rn "VITE_SENTRY_DSN" .github/ infra/ apps/*/cdk apps/*/bin`, no hit).
      - Commit `a387b4985` (2026-05-12, written by an agent) wrote the module as its plan said: "Observability: Sentry init guarded by VITE_SENTRY_DSN".
        - The plan, written in `52b2f7451` the same morning, mentioned the DSN in one row only, as a risk to contain: "Sentry DSN leaked to public client bundle … DSN is only embedded if `VITE_SENTRY_DSN` is set ; preview uses a separate DSN from prod". It had no row that sets the DSN in a workflow. (Material)

## Root cause of occurrence

*Thought an unset DSN is the safe state of an optional feature, actually a variable no environment sets is an off switch nobody can see, because the path that skips the feature looks the same as the path not configured yet.*

Material. The agent that wrote `a387b4985` built from a plan whose only DSN row framed its absence as the leak mitigation. The plan named a separate preview DSN, which assumes someone sets one, and gave nobody the task. The guard itself is right for `pnpm dev`. What was missing from the input was the wiring.

## Detection failure causes

- **Typing:** `string | undefined` is the honest type. Modelling the absence correctly is what makes it silent.
- **Linter:** no rule related a source-code environment read to a workflow that sets it. They are two files in two languages.
- **Local validation:** local development is the one stage where the variable should be unset, so the correct local behaviour hid the defect.
- **CI:** the build succeeds with the variable absent, by design. Coverage counted the module, because its tests set the variable themselves.
- **Code review:** three reviews of the module read code that was fine. The question "who sets this" is asked of a different file.
- **Blueprint:** the module carried `@Blueprint observability-adapter`, so it was advertised as the canonical example of reporting while it had never run.
- **Monitoring:** the missing thing was the monitoring.

## Countermeasure

Commit `882ab2b` made the module header say reporting is off until `VITE_SENTRY_DSN` is set, so the blueprint stopped advertising a live adapter. It also routed `CourseMap` and `RunnerAvatar`, which imported `@sentry/react` directly, through the adapter. Switching reporting on was left to the operator as a decision. It was taken in PR #263, which set `VITE_SENTRY_DSN: ${{ vars.SENTRY_DSN }}` for every app in `deploy.yml` and `preview.yml` (read this session).

## Eradication

**Type:** detection (level 4), on top of a DevX check (level 2) for names.

**Reference:** commit [`647e2148f`](https://github.com/hugoleborso/borso.fr/commit/647e2148f) (PR #46) added `scripts/check-frontend-env-vars.sh`, run in `.husky/pre-commit` and CI. It pairs the `VITE_*` variables the sites read with the ones the workflows set, and fails on a variable read and never set, unless `ALLOWED_UNSET` gives the reason. `ALLOWED_UNSET` is empty today (read this session).

The name check did not hold the class. [`the-variable-the-workflow-set-to-nothing.md`](./the-variable-the-workflow-set-to-nothing.md) is the same defect with the name set. `vars.PRAGMA_SENTRY_DSN` did not exist, GitHub evaluated it to an empty string, and pragma ran 17 days in prod with Sentry off. Commit [`cb33e10d8`](https://github.com/hugoleborso/borso.fr/commit/cb33e10d8) (PR #263) added a step to `deploy.yml` that fails a prod deploy with an empty DSN:

```sh
- name: Refuse to deploy with Sentry off
  run: |
    if [ -z "$VITE_SENTRY_DSN" ]; then
      echo "::error::vars.SENTRY_DSN is empty in the prod environment, …"
      exit 1
```

That step is what holds the Sentry case today, so the level is 4. Any other variable set to an empty value still passes both checks.

**Proposed:** make the DSN required in a production build. Each app's `apps/<app>/vite.config.ts` runs at build and already reads `process.env`, as pragma's `readBuildSetting` does. It would fail the build when `VITE_STAGE` is `prod` and `VITE_SENTRY_DSN` is empty. `readErrorReportingInputs()` is not the place, because it runs in the visitor's browser at load, and last-loop-lepin has no such file. A prod bundle without reporting could then not be built, whether the name is missing, misspelt or empty, and the `Refuse to deploy with Sentry off` step in `deploy.yml` could be deleted. Each API's `error-reporting.environment.ts` would need the same check where its Lambda environment is set at synth.

**Proof it can fail:** planting a read of an unwired `VITE_PROBE_NOT_WIRED` made `check-frontend-env-vars.sh` exit 1 and name the variable (recorded when it shipped). The first version of that check globbed `apps/*/site/src` and missed the sites without `src/`. The probe, planted in `borso-fr`, caught it, and the check now reads the git index over `:(glob)apps/*/site/**`.

**Similar instances:** when the check shipped, it found no other unwired variable. `VITE_API_BASE` and `VITE_STAGE` were both set by `deploy.yml` and `preview.yml`. [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md) is the same shape in the deploy process: a protection everyone believed in and nothing implemented.
