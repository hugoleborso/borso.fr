---
status: done
found-in: '#338'
closed: 2026-11-14
---

# Preview log groups of five teardowns

Delete the 13 preview log groups left by the teardowns of #298, #302, #312, #316 and #319

Closed: 2026-11-14.

## Evidence

A `Borso-Admin` session deleted the 13 and none failed (measured). `aws logs describe-log-groups --region eu-west-3 --log-group-name-pattern=-pr-` then listed groups only for #334, #336 and #337 (measured).
