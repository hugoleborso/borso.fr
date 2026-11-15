---
status: done
found-in: 'hugoleborso/borso.fr#321'
closed: 2026-11-14
---

# Borsouvertures reader invoke grant

Grant `AI-Dev-ReadOnly` invoke on the borsouvertures agent-reader Lambda

Closed: 2026-11-14.

## Evidence

A `Borso-Admin` session, at the operator's request, moved the reader statements into the managed policy `AI-Dev-ReadOnly-prod-agent-readers`, now covering four readers, and deleted the inline `Prod-db-read` (`docs/aws-setup.md`). `iam simulate-principal-policy` answers `allowed` for `lambda:InvokeFunction` on each reader, bare and `:$LATEST`, and `explicitDeny` on `borsouvertures-prod-api` and for `UpdateFunctionCode` on a reader (measured). Not run yet: `APP=borsouvertures scripts/db-read.sh` from a read-only session.
