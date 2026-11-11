---
date: 2026-11-11
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#295'
fix-pr: none (the kaizen pull request of PR #295 lands it; its number is not known when this is written)
fix-commits: [self]
eradication-level: 4
eradication-paths: [.github/workflows/preview.yml]
time-to-detect: hours
tags: [observability, preview, ci, github-actions, validation, gates]
zone: .github/workflows/preview.yml
weak-point: prose-stands-in-for-a-check
recurs: [the-variable-the-workflow-set-to-nothing]
---

# The preview that could not prove tracing

## User impact

PR #295 turned on tracing in six apps. Its plan, and ADR-2026-10-10T0457's
rollout before it, counted on the pull request's preview to show the first
trace. No preview sends anything to Sentry, so the first trace of five apps
happens in prod, after the merge. The session logged this at 19:48, three
minutes after it opened the pull request, whose body states the gap.

| | Seen | Expected |
| --- | --- | --- |
| PR #295's five previews | no span and no error in Sentry | a trace per page load and API request, as the plan assumed |
| prod after the 22:58 merge | `http.server` spans from pragma-api only in the next hour, and no `db*` span in 7 days (measured with Sentry `search_traces`) | the first trace of every app checked before merge |

## Causal chain

- The validation plan rested on a preview trace that could not exist
  - Preview jobs read `vars.SENTRY_DSN`, which is a variable of the `prod` environment only
    - A preview job names no environment, so the variable reads as an empty string
      - An empty DSN is the designed off switch, so every site and API starts with Sentry off
        - Nothing a person reads about a preview said so: the fact sat in a comment of `preview.yml`

## Root cause of occurrence

*Thought a preview runs the app as prod does, actually a preview runs it with
error reporting and tracing off.*

`.github/workflows/preview.yml` said it plainly: "they read as empty here and
previews run with Sentry off". ADR-2026-10-10T0457 says Sentry starts "when a
DSN is configured and the stage is `preview`, `integ` or `prod`", which is
true of the code and silent on the environment. A session reads the ADR and
the preview comment, not the workflow.

## Detection failure causes

- **Preview comment:** the sticky comment showed the URL and the commit, not
  that the preview is a different build from prod in one way that matters to
  observability work.
- **Plan:** no gate checks a plan's claim that a preview can prove something.

## Countermeasure

Every preview comment now ends with "Sentry off, so no error or trace from
this preview reaches Sentry" whenever the job's DSN is empty. That is where a
session or the operator looks when it validates on a preview, so the gap shows
before a plan leans on it.

Whether previews should send to Sentry at all is a product call on quota: the
ADR's margin is under two times at its bound. It is left to the operator.

## Eradication

**Type:** detection (level 4). The preview says what it cannot show.

**Reference:** commit adding this file.

```diff
+          if [ -z "$VITE_SENTRY_DSN" ]; then
+            note="$note · Sentry off, so no error or trace from this preview reaches Sentry"
+          fi
           echo "note=$note · <a href=\"$RUN_URL\">build log</a>" >> "$GITHUB_OUTPUT"
```

**Proof it can fail:** the step's script, run with an empty and a set DSN:

```
note=Updated from <code>abcdef1</code> · Sentry off, so no error or trace from this preview reaches Sentry · <a href="u">build log</a>
note=Updated from <code>abcdef1</code> · <a href="u">build log</a>
```

**Similar instances:** `grep -n "vars\." .github/workflows/preview.yml`.
`SENTRY_ORG` and `SENTRY_PROJECT` read empty the same way.
[The variable the workflow set to nothing](./the-variable-the-workflow-set-to-nothing.md)
is the prod half of this class, refused there by the deploy step.
