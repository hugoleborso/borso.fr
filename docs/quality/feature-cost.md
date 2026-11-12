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
| #278 | feature | `session_01K69KnCGKjTYePxLkUvhFGP`, which also ran this sweep | $95.00 at worker epoch 8, still running; whether it counts earlier epochs is unknown | 396,424 | $36.53 (4,566,022 tokens) | 2 | lessons from PR #278 |
| #281 | feature | `session_01K69KnCk2rXC5mXMhzM8Sxn` | $166.34 at worker epoch 14, idle; whether it counts earlier epochs is unknown | 221,945 | $22.24 (2,779,537 tokens) | none, no technical validation ran | lessons from PR #281 |
| #287 | meta | `session_01K69KnCk2rXC5mXMhzM8Sxn`, the same session as the #281 row above | $179.39 at worker epoch 16, idle; the #281 row read $166.34 of the same counter at epoch 14, so #287 and the board refresh after it added $13.05 | 309,696 | $24.71 (3,088,593 tokens), the session total, of which the #281 row already counted $22.24 | none, no technical validation ran | lessons from PR #287 |
| #290 | feature | `session_01K69KnDiEEWdfDTt4WT9hpf` | $49.93 at worker epoch 7, archived; whether it counts earlier epochs is unknown | 419,539 | $15.58 (1,947,284 tokens) | 2 | lessons from PR #290 |
| #295 | feature | `session_01K69KnEgRsJPo4hURciyRit` | $37.84 at worker epoch 5, archived; whether it counts earlier epochs is unknown | 444,343 | $13.41 (1,676,772 tokens) | 2 | lessons from PR #295 |
| #292, with the work of #286 and #289 closed unmerged | feature | `session_01K69KnCghwMgEmR1Dgo4H2u` | $149.30 at worker epoch 14, still running; it includes the work of PR #300, open, and whether it counts earlier epochs is unknown | 760,192 | $36.01 (4,501,789 tokens) | 6 reports, 2 per feature for three features; the Todo tab commit had none | lessons from PR #292 |
| #293 and #298 | fix | `session_01K69KnCk2rXC5mXMhzM8Sxn` for both, the same session as the #281 and #287 rows above | $334.54 at worker epoch 27, still running and measuring production after the merge; the #287 row read $179.39 of the same counter at epoch 16, so the two pull requests and whatever the session did between them added $155.15 | 615,656 | $49.23 (6,154,133 tokens), the session total, of which the #287 row already counted $24.71 | #293: 2. #298: 2, in three reports, because the round 2 report was committed once as a draft and once final | lessons from PRs #293 and #298 |
| #300 | feature | `session_01K69KnCghwMgEmR1Dgo4H2u`, the same session as the #292 row above, which also ran this sweep | $163.34 at worker epoch 14, still running; the #292 row read $149.30 of the same counter and already held most of this work, so the end of #300, its merge and this sweep so far added $14.04. Whether it counts earlier epochs is unknown | 158,701 after a compaction, where the #292 row read 760,192 | $39.39 (4,923,196 tokens), the session total, of which the #292 row already counted $36.01 | 4 reports, 2 per feature for two features; the second closeness report also covers the rework for every kind | lessons from PR #300 |
| #302 | meta | `session_01K69KnCFfnenvy1nWRERzUd`, the sweep of PR #295, which grew into ADR-2026-11-12T0008's bundling change | $36.47 at worker epoch 2, waiting on a question after the merge; whether it counts earlier epochs is unknown | 511,186 | $8.37 (1,045,758 tokens) | 2 | lessons from PR #302 |
| #310 | meta | `session_01K69KnDzbVY3yxgGHEWuPgJ` | $38.18 at worker epoch 1, archived | 618,766 | $4.44 (555,604 tokens) | none | lessons from PR #310 |
| #314 | feature | `session_01K69KnCkGVwNDQy7uL7VPYi` | $21.31 at worker epoch 6, idle after the merge; whether it counts earlier epochs is unknown | 424,851 | $7.76 (969,738 tokens) | 2, both ending FAIL; the round 2 finding was fixed before the merge with no third round | lessons from PR #314 |
| #316 | chore | `session_01K69KnBCpMuBJtxtgUa3FSc` | $5.50 at worker epoch 2, idle after the merge; whether it counts earlier epochs is unknown | 197,540 | $1.62 (202,444 tokens) | 1 | lessons from PR #316 |
