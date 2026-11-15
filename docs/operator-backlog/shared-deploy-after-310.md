---
status: done
found-in: '#310'
closed: 2026-11-14
---

# Shared deploy after 310

Dispatch `shared-deploy` once #310 is merged

Closed: 2026-11-14.

## Evidence

Run 43638500568 of `shared-deploy` ran on `9aaf039`, which contains #310, and ended `success` (measured). The LIVE `borsosharedHostRouter` CloudFront function equals `infra/cdk/src/internal/cf-host-routing-function.code.js` and answers 404 under `/api/` (measured). The `curl` check could not run, because the session proxy answers 403 to preview hosts.
