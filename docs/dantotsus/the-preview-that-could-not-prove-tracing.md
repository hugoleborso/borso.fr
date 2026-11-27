---
date: 2026-11-11
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#295'
fix-commits: [self]
eradication-level: 5
eradication-paths: [.github/workflows/preview.yml]
time-to-detect: hours
tags: [observability, preview, ci, github-actions, validation, gates]
zone: .github/workflows/preview.yml
weak-point: prose-stands-in-for-a-check
recurs: [the-variable-the-workflow-set-to-nothing]
---

# The preview that could not prove tracing

## User impact

PR #295 turned on tracing in six apps. Its validation counted on the pull
request's preview to show the first trace. No preview sends anything to
Sentry, so the first trace of five apps happens in prod, after the merge.
The session logged this at 19:48, three minutes after it opened the pull
request, whose body states the gap.

| | Seen | Expected |
| --- | --- | --- |
| PR #295's five previews | no span and no error in Sentry | a trace per page load and API request, as the validation assumed |
| prod after the 22:58 merge | `http.server` spans from pragma-api only in the next hour, and no `db*` span in 7 days (measured with Sentry `search_traces`) | the first trace of every app checked before merge |

## Causal chain

- The first trace of five apps could only happen in prod
  - PR #295's technical validation left database spans to a preview: "A
    preview trace of a database-backed route would settle it"
    (`docs/features/meta/sentry-tracing-all-apps/validation/technical-validation-2026-11-11-1908.md:130`)
    - The code and the ADR both name `preview` as a stage that reports:
      `const REPORTING_STAGES = ['preview', 'integ', 'prod'] as const;`
      (`apps/pragma/site/src/observability/error-reporting.core.ts:1`, the
      same in `borso-fr` and `borsouvertures`), and "both sides start only
      when a DSN is configured and the stage is `preview`, `integ` or
      `prod`" (`docs/adr/2026-10-10T0457-pragma-reports-errors-and-traces-to-sentry-eu.md:27`)
      - Every preview job feeds an empty DSN ← the faulty line

        ```yaml
        VITE_SENTRY_DSN: ${{ vars.SENTRY_DSN }} # a prod-environment variable, empty in a job that names no environment
        ```

        (`.github/workflows/preview.yml:168`)
        - Commit `85a613429` (PR #235, 2026-10-29) moved the DSN into the
          `prod` environment: "The prod environment now holds the DSN as
          SENTRY_DSN". Previews stopped reporting, and `REPORTING_STAGES`
          and the ADR kept `preview`
          - The repository holds two answers to "does a preview report",
            and the two an agent reads first say yes. Machine

## Root cause of occurrence

*Thought a preview reports to Sentry, as `REPORTING_STAGES` and the ADR say,
actually every preview job passes an empty DSN, which is the designed off
switch.* **Machine.**

Two sources of truth disagree. The code constant and ADR-2026-10-10T0457
list `preview` as a reporting stage. `.github/workflows/preview.yml:164-167`
says the opposite in a comment: "they read as empty here and previews run
with Sentry off". The disagreement was born when PR #235 moved the DSN to
the `prod` environment and left the stage list as it was. The validator read
the stage list and the ADR, and planned on a preview trace. Whether it also
read the workflow comment is unknown, since its report cites
`preview.yml:153` for another row.

## Detection failure causes

- **Preview comment:** the sticky comment showed the URL and the commit, not
  that the preview runs with Sentry off.
- **Stack tests:** the preview assertions in `last-loop-lepin` and
  `banana-rush` run with no DSN at all (same report, row D19), so no test
  compares the stage list with what a preview receives.
- **Validation:** no step checks that a claim "a preview will show X" can be
  observed on a preview.

## Countermeasure

Every preview comment now ends with "Sentry off, so no error or trace from
this preview reaches Sentry" whenever the job's DSN is empty. That is where a
session or the operator looks when it validates on a preview.

Whether previews should send to Sentry at all is a product call on quota: the
ADR's margin is under two times at its bound. It is left to the operator.

## Eradication

**Type:** knowledge (level 5). A notice in the preview comment, which
refuses nothing.

**Reference:** commit adding this file.

```diff
+          if [ -z "$VITE_SENTRY_DSN" ]; then
+            note="$note · Sentry off, so no error or trace from this preview reaches Sentry"
+          fi
           echo "note=$note · <a href=\"$RUN_URL\">build log</a>" >> "$GITHUB_OUTPUT"
```

It still holds (`preview.yml:430`). It prints and lets everything pass, so it
informs a reader who looks and stops no plan. The wrong source of truth,
`preview` in `REPORTING_STAGES` and in the ADR, is still there.

**Proof it can fail:** the step's script, run with an empty and a set DSN:

```
note=Updated from <code>abcdef1</code> · Sentry off, so no error or trace from this preview reaches Sentry · <a href="u">build log</a>
note=Updated from <code>abcdef1</code> · <a href="u">build log</a>
```

**Proposed:** subtract the wrong answer. Until the operator decides the quota
call, remove `preview` from `REPORTING_STAGES` in each
`error-reporting.core.ts` and from the ADR's *When it runs* line, so no reader
can plan on a preview trace and the code says what the workflow does. If the
operator turns previews on instead, extend the prod deploy step's refusal
from [the variable the workflow set to nothing](./the-variable-the-workflow-set-to-nothing.md)
to previews, with an explicit off flag in place of an empty DSN. Either way
the two sources could no longer disagree. Removing the stage changes nothing
a user sees today, but it closes the door the operator would open, so it is
his call.

**Similar instances:** `grep -rn "REPORTING_STAGES = " apps` lists the
copies of the stage list, and `grep -n "vars\." .github/workflows/preview.yml`
the variables that read empty in a preview. `SENTRY_ORG` and
`SENTRY_PROJECT` read empty the same way.
