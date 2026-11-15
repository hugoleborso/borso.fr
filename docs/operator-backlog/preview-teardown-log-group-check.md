---
status: refuted
found-in: '#303'
closed: 2026-11-14
---

# Preview teardown log group check

Confirm that a preview teardown leaves no log group

Closed: 2026-11-14, refuted.

## Evidence

The teardown of #319 (job 131567260160) swept pragma, borso-fr and borsouvertures, but logged `[skip] last-loop-lepin-pr-319: stack does not exist` and three `last-loop-lepin-pr-319` groups remain (measured). The skip branch never ran the sweep. This pull request runs it there. The leftover groups are an open row.
