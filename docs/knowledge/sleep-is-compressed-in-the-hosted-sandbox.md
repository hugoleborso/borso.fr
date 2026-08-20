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

**What to use instead.** Python's sleep is not compressed:

```bash
python3 -c "import time; time.sleep(180)"; date -u
```

```
Thu Aug 20 13:46:15 UTC 2026
Thu Aug 20 13:48:15 UTC 2026      # a real two minutes
```

**Why it matters beyond the annoyance.** The failure mode is not "my
wait was short", it is "I concluded the wrong thing about a remote
system". A job that has run for three minutes looks identical to one
that has run for forty when your only clock is how many times you have
polled. Before diagnosing a remote hang, print `date -u` and check
that time has actually passed.

**Related.** Cross-check any elapsed-time reasoning against the run's
own `created_at` / `updated_at` from the API rather than against how
many polls you have done.
