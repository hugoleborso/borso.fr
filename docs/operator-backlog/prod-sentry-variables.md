---
status: done
found-in: '#235, #263'
closed: 2026-11-11
---

# Prod sentry variables

Set the Sentry variables and the `SENTRY_AUTH_TOKEN` secret in the `prod` environment

Closed: by 2026-11-11.

## Evidence

`deploy.yml` refuses an empty DSN, and deploy runs 219 to 221 ended `success` (inferred)
