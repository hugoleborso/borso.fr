---
date: 2026-08-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/33
fix-pr: https://github.com/hugoleborso/borso.fr/pull/46
fix-commits: [882ab2b]
eradication-level: 2
time-to-detect: months
tags: [vite, observability, ci, github-actions, gates, process]
---

# A feature nobody switched on, in any stage, for months

## Symptom

Hugo, on `site/src/observability/sentry.ts`:

> *We have sentry ? Where ?*

A fair question with an uncomfortable answer: in the bundle, and nowhere else.
`@sentry/react` was a real dependency shipping to every visitor,
`initSentry()` was called from `main.tsx`, three components recorded
breadcrumbs — and not one event had ever left a browser, in dev, in preview or
in production, since the module landed.

```ts
export function initSentry(): void {
  const dsn = readSentryDsn();
  if (dsn === undefined) return;   // ← taken, always, everywhere
  Sentry.init({ … });
}
```

`VITE_SENTRY_DSN` is set by no workflow, no CDK stack and no entry point:

```bash
grep -rn "VITE_SENTRY_DSN" .github/ infra/ apps/*/cdk apps/*/bin   # no hits
```

## Root-cause chain

1. **Why did reporting never start?** `readSentryDsn()` returned `undefined`,
   so `initSentry` returned before `Sentry.init`.

2. **Why was it `undefined`?** Vite inlines `import.meta.env.VITE_X` at build
   time and substitutes `undefined` when the variable is absent. No workflow
   ever set it.

3. **Why did nothing fail?** Because that is the designed behaviour of the
   guard. The `dsn === undefined` early return is *correct* — a developer
   running `pnpm dev` should not post to a production Sentry project. The guard
   that makes local development pleasant is the same guard that makes a
   permanently-unconfigured production silent.

4. **Why did no gate notice?** Every gate we own asks whether the code is
   right. None asks whether the code is *reachable in a deployed stage*.
   Coverage counted the module (its tests set the variable themselves), the
   type checker was satisfied, the linter had nothing to say, and the browser
   passes exercised screens rather than the absence of a network call to a
   third party.

5. **Why did the documentation say otherwise?** Because the module carried a
   `@Blueprint observability-adapter` block advertising itself as this
   repository's canonical example of reporting. A reader had no way to tell the
   blueprint was describing something that had never run. The ratified
   `race-day-live` spec chose *"(a) Sentry frontend + 4 events analytics"*, so
   the intent existed and only the wiring was missing — and nothing connected
   the intent to the wiring.

**Root cause:** thought *an optional configuration variable is a graceful
degradation*, actually *an optional variable that no environment ever sets is
an off switch nobody can see*, because the code path that skips the feature is
indistinguishable from the code path that has not been configured yet.

## Detection failure causes

- **Typing:** `string | undefined` is the honest type. The absence is modelled
  correctly and modelling it correctly is what makes it silent.
- **Linter:** no rule relates a source-code environment read to a workflow that
  sets it. Those are two files in two languages that nothing joins.
- **Functional validation locally:** local development is the one stage where
  the variable *should* be unset, so the correct local behaviour is the
  defect's disguise.
- **CI:** the build succeeds with the variable absent, by design.
- **Code review:** three reviews of the module looked at the code, which was
  fine. The question that catches this is not "is this right" but "who sets
  this", and it is asked of a different file.
- **Production monitoring:** the missing thing *was* the monitoring. There is
  no alarm for the absence of an alarm.

## Countermeasure

- **Code:** commit `882ab2b` — the module header now says plainly that
  reporting is off until `VITE_SENTRY_DSN` is set, so the blueprint stops
  advertising a live adapter. The same commit fixes the part the blueprint
  claimed and the code did not do: `CourseMap` and `RunnerAvatar` imported
  `@sentry/react` directly, each choosing its own category and message, and
  both now go through the adapter.
- **Operator action:** switching reporting on needs a Sentry project and a
  `VITE_SENTRY_DSN` secret in `deploy.yml` and `preview.yml`. That is a
  decision, not a diff, and it is open in the PR thread.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit hook and CI)

**Reference:** [PR #46](https://github.com/hugoleborso/borso.fr/pull/46) ·
this kaizen PR's commits

**The actual fix:** `scripts/check-frontend-env-vars.sh` pairs the two sets
that nothing joined before — the `VITE_*` variables the sites read, and the
ones the workflows set. A variable in the first set only is either a wiring bug
or a decision, and a decision has to be written down with its reason:

```bash
declare -A ALLOWED_UNSET=(
  [VITE_SENTRY_DSN]="reporting is off until a Sentry project and secret exist; …"
)
```

The allowlist is the point. It converts "nobody noticed" into a line a reviewer
reads, and deleting that line without setting the variable fails the commit.

Proven in both directions before landing: green on the tree as it stands, and
planting a read of an unwired `VITE_PROBE_NOT_WIRED` makes it exit 1 and name
the variable. Wired into `.husky/pre-commit` and `.github/workflows/ci.yml`
beside `check-single-stylesheet.sh`.

**One trap the check walked into itself, and the fix.** The first version
globbed `apps/*/site/src`, which covers `pragma` and `last-loop-lepin` and
silently misses `borso-fr` and `borsouvertures`, whose sites have no `src/`
directory — the exact defect PR #46 documented in standard 08, reproduced
inside the eradication for a different defect in the same hour. The planted
probe is what caught it, because the probe landed in `borso-fr`. It now reads
the git index over `:(glob)apps/*/site/**`, which covers both layouts. A
directory pathspec without `:(glob)` matches nothing here, which is worth
knowing before writing the next one of these.

**Sibling defects swept:** the check found no other unwired variable today —
`VITE_API_BASE` and `VITE_STAGE` are both set by `deploy.yml` and
`preview.yml`. The value is in the next one.

## See also

- [`docs/dantotsus/a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md)
- [`docs/dantotsus/an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md)
  — the same shape in the deploy process: a protection everyone believed in
  and nothing implemented.
- [`docs/standards/06-data-fetching.md`](../standards/06-data-fetching.md)
