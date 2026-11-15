---
status: open
found-in: 'hugoleborso/borso.fr#321'
right: 'The `borso-admin` AWS profile, with `psql` and `node`'
---

# Borsouvertures operator credential

Run `scripts/seed-operator-credential.sh` once after the merge that ships borsouvertures sync, and again to change the password. No route enrols anyone (ADR-2026-11-13T0002), so until it runs sign-in answers `auth-not-bootstrapped` and the app stays a local trainer.

## Done when

A sign-in with a wrong password on `borsouvertures.borso.fr` answers 401 and no longer `auth-not-bootstrapped`
