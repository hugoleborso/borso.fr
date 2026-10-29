# Feature cost: targets and measurements

PR #224 cut review rounds, per-call context and harness to bring a feature
under $150 of tokens. Its Kaizen, step 6, set the targets below for the next
three feature pull requests. The `/after-task-kaizen` sweep of each merged
feature pull request owns the measurement: it adds one row to the table below,
in its own kaizen pull request. The sweep that writes the third feature row
compares the three rows with the targets and says in its pull request which
targets failed and what that decides.

## Targets

| Measure | Before #224 (measured) | Target | Source the sweep reads |
| --- | --- | --- | --- |
| Cost per feature | $104 to $2,392 per session | under $150 | `get_session` `external_metadata.usage.cost_usd`, summed over every session in the commits' `Claude-Session` trailers |
| Main-session context | median 195k to 643k tokens per call | median under 150k | `get_session` `context_usage.used_tokens` at the end, a ceiling of the last call. Under 150k passes. Above it, the median is unknown until a transcript sample is read |
| Cache rebuilds after a wait | up to 42% of a session | under $2 per feature | `usage.cache_write_tokens` at $8 per million, the one-hour write price. This is a ceiling, because it counts every cache write and not only the rebuilds |
| Technical review rounds | 3 or more in 9 of 21 features | 2 at most | The number of `technical-validation-*.md` reports under the feature's `validation/` folder |

Prices are Opus 5.5's, from the Kaizen's sources: $0.20 per million cache
reads, $5 (5 minutes) or $8 (1 hour) per million cache writes, $20 per million
output tokens. `cost_usd` is the session's own figure, so a total is never
re-priced. A script that re-prices older sessions at another model's rates
disagrees with it, which is how one audit on PR #224 doubled its totals.

Reading a transcript is expensive. See
[`../knowledge/reading-another-sessions-transcript-with-list-events.md`](../knowledge/reading-another-sessions-transcript-with-list-events.md)
before reaching for `list_events`.

## Measurements

One row per merged pull request. Only `feature` rows count toward the three.

| PR | Kind | Sessions | Cost | Final context | Cache-write ceiling | Review rounds | Swept by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #224 | meta | `session_01K69KnFMwexFAkg7bqDpDTu` | $115.61 | 709,659 | $43.43 (5,428,463 tokens) | none | lessons from PR #224 |
| #228 | meta | `session_01K69KnC3z5ZgBCLywzoUmpj` | unknown, the session was still running | unknown | unknown | none | lessons from PR #228 |
