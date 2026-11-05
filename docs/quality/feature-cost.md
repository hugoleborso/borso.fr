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
| #216 and #231 | feature | `session_01Leu3Yhimw9wioFyRfsVdKa` | $778.45, which may cover only the latest resume (worker epoch 23); the session was still running | 363,134 | $328.99 (41,124,023 tokens) | 9 | lessons from PR #216 |
| #230 | meta | `session_01K69KnB6rgd7Vc8bpRUzdAe` | $3.44 at the sweep, the session was still running | 173,750 | $0.98 (122,858 tokens) | none | lessons from PR #230 |
| #234 | feature | `session_01K69KnF9rPTaaMnkUfLUkB9`; its four `session_01Leu3Yhimw9wioFyRfsVdKa` commits are the #231 fixes, counted in that row | $54.95, which may cover only the latest resume (worker epoch 4); the session was archived | 427,521 | $15.44 (1,929,516 tokens) | 2 | lessons from PR #234 |
| #235 | feature | `session_01K69KnAzzigT63QYQpKfY3q` | $9.89 at the sweep, which includes this sweep; the session was still running | 228,713 | $3.27 (408,174 tokens) | none, no technical validation ran | lessons from PR #235 |
| #236 | meta | `local_ebb74411-cdc8-4012-a143-d1f5774ba568` | unknown, a local session reports no usage through `get_session` | unknown | unknown | none | lessons from PR #236 |
| #238 | feature | `session_01K69KnC85eQ9YvXqSyKWSAF` | $25.85 at worker epoch 5, archived; whether it counts earlier epochs is unknown | 455,516 | $5.52 (689,659 tokens) | 2 | lessons from PR #238 |
| #240 | meta | `session_01K69KnEN4KZEAddTa4QvvkW` | $11.87 at the sweep, which includes PR #242; the session was still running | 336,914 | $2.28 (284,799 tokens) | none | lessons from PR #240 |
| #243 | fix | `local_77f39bae-cf48-48d6-8820-2e2ca6e7d6f7`, a local Desktop session; the commits carry no `Claude-Session` trailer | unknown, `get_session` reports no usage for a local session | unknown | unknown | none | lessons from PR #243 |
| #246 and #247 | fix | `session_01K69KnEDPB6Btg2TGPiX39C` for both; #247 also carries 8 commits from `session_01K69KnBD6VQ779wocFdaa8R`, which `get_session` does not find | $28.25 for the first session at worker epoch 3, archived; the second is unknown | 116,926 | $6.99 (874,016 tokens) | #246 none; #247 2 | lessons from PRs #246 and #247 |
| #251 | feature | `session_01K69KnEgGhRxs5YnwwG4V2U` | $19.65, archived at worker epoch 1 | 407,358 | $4.80 (599,898 tokens) | 2 | lessons from PR #251 |
| #250 | feature | `session_01K69KnBwacsmUASeMPrnkQN` | $10.27 at worker epoch 4, archived; whether it counts earlier epochs is unknown | 284,175 | $2.59 (323,241 tokens) | none, no technical validation ran | lessons from PR #250 |
| #252 | feature | `session_01K69KnCZjVdjzoStLVQhSxc` | $7.59 at worker epoch 3, idle; whether it counts earlier epochs is unknown | 269,420 | $1.74 (217,687 tokens) | none, no technical validation ran | lessons from PR #252 |
| #253 | meta | `session_01K69KnEDyeFjU26Ww6Xh6B3` | $11.36 at worker epoch 2, archived; whether it counts earlier epochs is unknown | 303,190 | $3.86 (483,057 tokens) | none | lessons from PR #253 |
| #249 | meta | `session_01K69KnB5EhtrTuPUuosnWCt` | $48.61 at worker epoch 6, archived; whether it counts earlier epochs is unknown | 471,791 | $14.34 (1,792,898 tokens) | none, no technical validation ran | lessons from PR #249 |
| #257 | meta | `session_01K69KnCC1GwhF77rMwHPkuZ` | $3.09 at worker epoch 1, archived | 184,460 | $1.06 (132,757 tokens) | none | lessons from PR #257 |
| #260 | meta | `session_01K69KnCwQDn1QLU5ERgd53b`, which also ran this sweep | $11.54 at worker epoch 2, still running | 289,929 | $3.24 (405,162 tokens) | none | lessons from PR #260 |
| #263 | feature | `session_01Pdgdwh6XadKdvwaqsm7MJZ`, which also ran this sweep | $60.05 at worker epoch 24, still running; whether it counts earlier epochs is unknown | 580,433 | $26.65 (3,331,085 tokens) | none, no technical validation ran | lessons from PR #263 |
| #261 | feature | `session_01K69KnCef9VDkTpdGgT6TsD` | $82.35 at worker epoch 7, archived; whether it counts earlier epochs is unknown | 635,929 | $24.73 (3,091,767 tokens) | 2 | lessons from PR #261 |
| #274 | fix | `session_01K69KnDxxGsB1pU2gEMd8B3`, which also ran this sweep | $11.44 at worker epoch 2, still running; whether it counts earlier epochs is unknown | 301,029 | $3.76 (470,046 tokens) | none, no technical validation ran | lessons from PR #274 |
