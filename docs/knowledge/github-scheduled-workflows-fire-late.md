# Scheduled workflows fire late, so never key a check on the cron time

`cleanup-orphans.yml` declares `cron: '17 3 * * *'`. It has never once run
at 03:17. Every observed firing, taken from the run list:

| Date | Declared | Actually fired | Late by |
| --- | --- | --- | --- |
| 2026-08-06 | 03:17 | 06:02 | 2h45m |
| 2026-08-07 | 03:17 | 05:00 | 1h43m |
| 2026-08-08 | 03:17 | 04:18 | 1h01m |
| 2026-08-09 | 03:17 | 04:33 | 1h16m |
| 2026-08-10 | 03:17 | 04:51 | 1h34m |
| 2026-08-11 | 03:17 | 04:37 | 1h20m |

GitHub documents `schedule` as best-effort: runs queue behind the shared
runner pool and are dropped entirely under high load. The cron is the
earliest a run may start, not when it does.

**Consequences that have actually bitten:**

- A verification check-in armed for 03:30 found nothing and reported
  "hasn't fired", costing a wake-up. Arm past the worst observed delay,
  not past the declared time.
- A workflow whose schedule is genuinely time-sensitive (a nightly cost
  report, a certificate check with a deadline) cannot rely on `schedule`
  alone. Neither can anything that assumes yesterday's run completed
  before today's window opens.
- Runs skipped under load leave no failed run to notice — the workflow
  simply has a gap in its history. Absence of a red run is not evidence
  the job ran.

**Rule:** when waiting on a scheduled run, read the last few actual
`created_at` values and key the wait on those. The data is one API call
away and it is never the cron expression.

## The general shape

This is the third instance in two days of the same mistake: taking a
*declared* value over an *observed* one. The other two both cost real
debugging:

- A `prod-shared` reviewer gate described in two files and never
  configured — [`an-approval-gate-that-only-existed-in-a-comment.md`](../dantotsus/an-approval-gate-that-only-existed-in-a-comment.md).
- An OIDC `sub` claim assumed to identify the workflow when it identifies
  the event — [`the-nightly-sweeper-never-had-permission-to-run.md`](../dantotsus/the-nightly-sweeper-never-had-permission-to-run.md).

In all three the observed value was already available: the run list, the
run timestamps, the job log. Read the artefact.

## A related trap: a monitor that cannot report its own failure

Chasing this verification, a poll loop watching a CI run emitted nothing
for twenty minutes and was read as "still running". It was broken —
`$GITHUB_TOKEN` is not in the session shell, so every request returned an
error body and the `jq` filter matched zero runs. A dead monitor and a
quiet pipeline produce identical silence.

The rewrite made the failure branch explicit:

```bash
code=$(printf '%s' "$body" | sed -n 's/^HTTP://p' | tail -1)
if [ "$code" != "200" ]; then
  echo "POLL BROKEN (http=${code:-none}) — not the same as CI being quiet"
  sleep 30; continue
fi
```

It fired on the first iteration with `http=403` — the agent proxy blocks
unauthenticated api.github.com — which is the mechanism working. **Before
arming any watch, ask: if the thing I am polling broke right now, would my
filter emit anything?** If not, widen it. Prefer the GitHub MCP tools over
`curl` from a session shell, since they carry credentials the shell does
not.
