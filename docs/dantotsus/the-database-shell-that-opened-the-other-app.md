---
date: 2026-10-02
introduced-at: conception
detected-at: local
severity: medium
related-pr: "#107"
fix-pr: "#119"
fix-commits: [cda3dd2]
eradication-level: 1
time-to-detect: weeks
tags: [dsql, tooling, operator]
---

# The database shell that opened the other app

## Symptom

Preparing PR #107's password-reset handoff meant telling a local session
how to open pragma's production database. The shell script needed two
warnings to be used safely:

- run without `APP`, it opened **last-loop-lepin's** production database;
- run with `APP=pragma`, it still printed *"Tables: editions, runners,
  loop_punches, manual_dnfs, auth_attempts, _migrations"*, none of which
  pragma has.

## Root-cause chain

1. **Why did it open last-loop-lepin?** `APP="${APP:-last-loop-lepin}"`.
2. **Why that default?** The script was written when last-loop-lepin was
   the only application with a DSQL cluster. A default was a convenience
   then, and correct.
3. **Why did it stay?** Adding pragma and banana-rush clusters did not
   touch the script, since passing `APP` already worked. The default went
   from convenient to wrong without a line changing.
4. **Why the wrong tables?** The banner was a literal string written for
   the same one application.

**Root cause:** thought the default named the application, actually it
named the only application there was when it was written.

## Detection failure causes

- **Linter / static analysis:** no rule can tell a stale default from a
  deliberate one.
- **Code review:** each new cluster was reviewed in its own stack, not
  against the operator scripts that read its parameters.

## Countermeasure

- **Operator action:** the PR #107 handoff named `APP=pragma` explicitly
  and warned about the banner.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commit `cda3dd2`

**The actual fix:** `APP` has no default. The script stops before any AWS
call when it is missing, and the banner names the application and points
at `\dt` instead of listing one application's tables:

```diff
-APP="${APP:-last-loop-lepin}"
+APP="${APP:?APP is required: name the application whose cluster to open, for example APP=pragma}"
```

Opening the wrong production database by omission is no longer possible;
the operator has to type the application's name.

**Sibling defects swept:** `scripts/seed-admin-pin.sh` names the script
in a comment only and passes nothing through it.

## See also

- [`the-production-database-is-out-of-reach-of-a-hosted-session.md`](../knowledge/the-production-database-is-out-of-reach-of-a-hosted-session.md)
- [`aws-dsql-cli-token-flag-name.md`](../knowledge/aws-dsql-cli-token-flag-name.md)
