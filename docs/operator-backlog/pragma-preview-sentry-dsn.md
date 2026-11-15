---
status: open
found-in: '#298'
right: 'GitHub repository or environment variables'
---

# Pragma preview sentry dsn

Make `SENTRY_DSN` a repository variable, or give the preview job its own, so a pragma preview runs Sentry. Until then the flush after a cold first request, 165 to 280 ms in production (measured), can only be worked on by merging to find out.

## Done when

A cold start of `pragma-pr-<n>-api` logs a wide event whose `trace.id` is set
