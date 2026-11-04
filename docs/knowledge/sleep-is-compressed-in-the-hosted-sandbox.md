---
summary: 'Foreground `sleep` is blocked and background `sleep` returns early in the hosted sandbox. To wait for CI, end the turn and let the PR event wake you; check `date -u` before diagnosing a remote hang.'
triggers:
  commands:
    - '\bsleep\s+\d'
---

# `sleep` does not sleep in the hosted sandbox

**Symptom.** Waiting on a CI run from a claude.ai/code session, eight
polls of `sleep 300` in a row all returned, and the workflow job still
showed the same step in progress. It read exactly like a hung runner:
a job apparently stuck 40 minutes on `pnpm run format:check`.

It was not stuck. Roughly four minutes of wall clock had passed.

**What actually happens.** `sleep` returns early — often in seconds,
whatever duration you ask for. `date` tells the truth:

```
$ date -u; sleep 600; date -u
Thu Aug 20 13:45:41 UTC 2026
Thu Aug 20 13:46:01 UTC 2026      # 20 seconds, not 600
```

Foreground `sleep` is blocked outright by the harness; the background
form is accepted and then compressed. The GitHub API is fine — it was
reporting the job honestly the whole time. The clock was the liar.

**What to do instead.** Do not wait in a command at all.

- Waiting on CI, a review or a merge: subscribe to the pull request and end
  the turn. The PR event wakes the session (CLAUDE.md, *No recurring job,
  scheduled check-in or polling loop*).
- Waiting on a local process: start it with `run_in_background` and let its
  exit re-invoke you, or watch it with `Monitor`.

This entry used to recommend `python3 -c "import time; time.sleep(180)"`,
because Python's sleep is not compressed. That is a polling loop by another
name, and it routes around the block the harness put on `sleep`. The sweep of
PR #251 still reached for `sleep 60; cat …` and was blocked.

**Why it matters beyond the annoyance.** The failure mode is not "my
wait was short", it is "I concluded the wrong thing about a remote
system". A job that has run for three minutes looks identical to one
that has run for forty when your only clock is how many times you have
polled. Before diagnosing a remote hang, print `date -u` and check
that time has actually passed.

**Related.** Cross-check any elapsed-time reasoning against the run's
own `created_at` / `updated_at` from the API rather than against how
many polls you have done.
