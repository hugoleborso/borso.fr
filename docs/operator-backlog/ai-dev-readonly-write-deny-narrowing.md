---
status: done
found-in: '#199, #218, #221'
closed: 2026-11-11
---

# Ai dev readonly write deny narrowing

Narrow `Explicit-write-deny` on `AI-Dev-ReadOnly` and grant invoke on the agent-reader Lambdas

Closed: by 2026-11-11.

## Evidence

`APP=pragma scripts/db-read.sh "SELECT 1 AS ok"` returned `{"ok":1}`
