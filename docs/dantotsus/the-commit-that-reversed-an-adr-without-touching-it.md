---
date: 2026-10-05
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#131'
fix-commits: [a0cf303c8d, bf93d2d593]
eradication-level: 2
eradication-paths: [scripts/check-coupled-lists.sh]
time-to-detect: weeks
tags: [pragma, adr, cdk, dsql, gates]
zone: apps/pragma/cdk/lib/stack.ts
---

# The commit that reversed an ADR without touching it

## User impact

The operator opened the PR #131 preview to test a fix and could not sign in.

| | Seen | Expected |
| --- | --- | --- |
| Recovery screen, right group password | *L'application n'est pas encore initialisée.* | signed in with production's password, on production's data |

The preview was meant to hold production's data and accept production's
accounts. Every pragma preview deployed in the three weeks before was affected
the same way (inferred from the stack, not probed per preview). The agent then
said the preview needed production's password, and offered to run the fixture
seed, which would have wiped the preview's copy of production. The operator
refused both.

## Causal chain

- The API answered `503 auth-not-bootstrapped`.
  - The preview had no `app_config` row and no `member_credential` rows.
    - `apps/pragma/cdk/lib/stack.ts` listed both in `tableBlocklist`, so the
      clone from production created the tables and copied no rows:
      ```ts
      tableBlocklist: [  // ← the faulty list
        'auth_attempt',
        'app_config',
        'member_credential',
        'member_passkey',
        'webauthn_challenge',
      ],
      ```
      - `03bd354` (2026-09-14) moved the four tables there "so a preview clone
        carries no secret of production". Its message reasons from
        `docs/knowledge/a-pragma-preview-cannot-be-signed-into.md` and names
        no ADR. ADR-2026-08-09T1654, which had decided that a preview carries
        production's credential, was not in that commit's context. (Material)
        - `03bd354` was itself a fix. An hour earlier, `0dd2f9a8f` had put
          `member_credential`, `member_passkey` and `webauthn_challenge` in
          `tablesToReplace` and written "Without this line every preview would
          carry every member's real password hash". It read the name as "left
          behind", when it means "copied from the source after emptying the
          target". `03bd354` corrected the misreading and flipped the decision
          in the same commit. (Machine)
- The agent's first answer was wrong.
  - It read the same knowledge entry, written before `03bd354` and describing
    the cloned credential, before it read the stack.

## Root cause of occurrence

*Thought the stack's clone lists were an implementation detail a commit could
change on its own, actually they are ADR-2026-08-09T1654's decision table, and
changing one without the other leaves a documented decision that no longer
holds.* (Material)

The commit that reversed the decision was built from a knowledge entry, not
from the ADR. Under the agentic 4M rule the cause is Material: the document
holding the decision was absent from its context. The branch below it is
Machine. The name `tablesToReplace` invited the opposite reading, and two
commits on the same day read it two ways.

## Detection failure causes

- **Typing:** `DsqlSchema` asks only that each credential table sits on one of
  the two lists. Both were valid to it, and its error message offers the
  blocklist first.
- **CI:** `apps/pragma/cdk/test/stack.test.ts` pins the lists exactly, and
  `03bd354` updated the test in the same commit. A test rewritten with the code
  it pins checks nothing about intent.
- **Linter:** nothing connected the stack to the ADR.
- **Review:** the commit message argued well for the change, and nothing
  pointed a reviewer at the ADR it contradicted.
- **Monitoring:** a preview nobody signs into looks healthy.

## Countermeasure

`a0cf303` moved `app_config` and `member_credential` to `tablesToReplace`, so
they are copied and replaced on every deploy. `member_passkey` and
`webauthn_challenge` stay blocklisted, because a passkey is bound to
production's relying-party id. The ADR gained an amendment and both lists in
its table, and the knowledge entry was rewritten.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #131](https://github.com/hugoleborso/borso.fr/pull/131) · commits `a0cf303`, `bf93d2d`

Section 5 of `scripts/check-coupled-lists.sh`, run in pre-commit and in CI,
requires `tableBlocklist` and `tablesToReplace` in the pragma stack to name
exactly the tables on the ADR's row of the same name, in both directions. It
resolves a spread constant such as `...SECRET_TABLES_BLOCKED_ON_PREVIEW`.
Moving a table between lists fails until the ADR moves it too, so the commit
that changes what a preview copies is the commit that amends the decision. Run
against the stack as it was before `a0cf303`, the check fails on both lists.

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

**Proposed:** remove the name that started the chain. Reshape
`cloneFromSchema` in `infra/cdk/src/constructs/dsql-schema.ts` into one
per-table record whose values say what the preview gets, such as
`{ app_config: 'copyFromSource', member_passkey: 'leaveEmpty' }`, and have
`scripts/check-coupled-lists.sh` read that single record against the ADR. The
misreading of `0dd2f9a8f` becomes inexpressible, and two lists that had to
agree with each other become one. The same shape is proposed in
[the-clone-conceded-the-password-to-a-stale-row](./the-clone-conceded-the-password-to-a-stale-row.md),
where it also removes the hand-kept list of credential table names.

**Similar instances:** last-loop-lepin clones production too, but no ADR states
its lists, so there is nothing for its stack to disagree with.
