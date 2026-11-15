---
status: done
found-in: '#292, which holds the closed #286 and #289'
closed: 2026-11-11
---

# Talos fire parameters

Create the SecureStrings `/talos/fire-url`, `/talos/fire-token` and `/talos/secret-phrase`, and make the talos agent routine read the `message:` line

Closed: 2026-11-11.

## Evidence

`aws ssm get-parameters --region eu-west-3 --names /talos/fire-url /talos/fire-token /talos/secret-phrase` returned the three as `SecureString` and an empty `InvalidParameters` (measured on 2026-11-12). `/talos/fire-url` matches `https://api.anthropic.com/…/fire` (measured). It is the API trigger of the routine "Talos : message", created the same day on the talos repository in the "Talos build" environment (operator's account, not read here). The routine reads the `message:` line since commit `dc66bcb` of `hugoleborso/talos`. Not verified: a real fire from the PWA to the routine.
