---
status: done
found-in: 'hugoleborso/borso.fr#321'
closed: 2026-11-14
---

# Borsouvertures sentry alert rules

Create the Sentry alert rules for the five borsouvertures errors

Closed: 2026-11-14.

## Evidence

Project `borsofr` lists rules 1495775 to 1495779 (measured). Each filters on tag `app` equal to `borsouvertures`, on `exception.type`, and on environment `prod`. Three fire on the first event of a new issue. `ReviewEventStoreUnavailableError` and `StockfishLoadFailedError` fire past 4 events in a day, at most once a day. Each emails the issue owners, falling back to active members.
