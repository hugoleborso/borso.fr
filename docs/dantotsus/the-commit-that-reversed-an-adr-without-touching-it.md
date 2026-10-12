---
date: 2026-10-05
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: "#131"
fix-pr: "#131"
fix-commits: [a0cf303, bf93d2d]
eradication-level: 2
time-to-detect: weeks
tags: [pragma, adr, cdk, dsql, gates]
---

# The commit that reversed an ADR without touching it

## Symptom

The operator opened the PR #131 preview to test a fix and could not sign
in. The recovery screen, given the right group password, answered
*L'application n'est pas encore initialisée.* The agent first said the
preview needed production's password, then offered to run the fixture
seed, which would have wiped the preview's copy of production. The
operator refused both: the preview was meant to hold production's data and
accept production's accounts.

## Root-cause chain

1. **Why did the API answer `503 auth-not-bootstrapped`?** The preview had
   no `app_config` row and no `member_credential` rows.
2. **Why were they missing?** `apps/pragma/cdk/lib/stack.ts` listed both in
   `tableBlocklist`, so the clone from production created the tables and
   copied no rows.
3. **Why were they blocklisted?** Commit `03bd354` moved them there to keep
   production's secrets out of previews. Its message even named the
   consequence: previews would start with no credential.
4. **Why was that a defect and not a decision?** [ADR-0009](../adr/0009-pragma-previews-clone-production.md)
   had decided the opposite, and said why: a preview is useful only with
   real data, and production's own credential is the only one that is
   neither published nor in need of distribution. The commit changed the
   behaviour and left the ADR saying the opposite, so the decision still
   read as in force for three weeks.
5. **Why did the agent then give a wrong answer?** It read
   `docs/knowledge/a-pragma-preview-cannot-be-signed-into.md`, written
   before `03bd354` and still describing the cloned credential, before
   reading the stack.

**Root cause:** we thought the stack's clone lists were an implementation
detail a commit could change on its own; actually they are the ADR's
decision table, and changing one without the other leaves a documented
decision that no longer holds.

## Detection failure causes

- **Typing:** `DsqlSchema` asks only that each credential table appears on
  one of the two lists. Both were equally valid to it, and its own error
  message offers the blocklist first.
- **Linter / static analysis:** nothing connected the stack to the ADR.
- **CI (tests / build):** `apps/pragma/cdk/test/stack.test.ts` pins the
  lists exactly, and `03bd354` updated the test in the same commit. A test
  that is rewritten with the code it pins checks nothing about intent.
- **Code review:** the commit message argued well for the change, and
  nothing pointed a reviewer at the ADR it contradicted.
- **Staging monitoring:** a preview nobody signs into looks healthy.

## Countermeasure

- **Code:** commit `a0cf303` — `app_config` and `member_credential` moved
  to `tablesToReplace`, so they are copied and replaced on every deploy;
  `member_passkey` and `webauthn_challenge` stay blocklisted, because a
  passkey is bound to production's relying-party id. ADR-0009 gained an
  amendment and both lists in its table, and the knowledge entry was
  rewritten.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — DevX check)

**Where:** `scripts/check-coupled-lists.sh`, section 5, which runs in
pre-commit and in CI.

**What changed:** each of `tableBlocklist` and `tablesToReplace` in the
pragma stack has to name exactly the tables on ADR-0009's row of the same
name, in both directions. Moving a table between lists fails until the ADR
moves it too, so a commit that changes what a preview copies is the commit
that amends the decision. Run against the stack as it was before
`a0cf303`, the check fails on both lists.

**Reference:** [PR #131](https://github.com/hugoleborso/borso.fr/pull/131) ·
commits `a0cf303`, `bf93d2d`

**The actual fix:**

```diff
-              tableBlocklist: [
-                'auth_attempt',
-                'app_config',
-                'member_credential',
-                'member_passkey',
-                'webauthn_challenge',
-              ],
+              tableBlocklist: ['auth_attempt', 'member_passkey', 'webauthn_challenge'],
+              tablesToReplace: ['app_config', 'member_credential'],
```

**Sibling defects swept:** `last-loop-lepin` clones production too, but no
ADR states its lists, so there is nothing for its stack to disagree with.

## See also

- [two-copies-that-had-to-agree-and-nothing-made-them](./two-copies-that-had-to-agree-and-nothing-made-them.md),
  the dantotsu that created `check-coupled-lists.sh`.
- [lectured-without-reading-the-code](./lectured-without-reading-the-code.md),
  the shape of step 5.
- [dsql-clone-from-prod](../knowledge/dsql-clone-from-prod.md).
