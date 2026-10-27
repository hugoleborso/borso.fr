---
date: 2026-10-27
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#199'
fix-pr: '#200'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/database/read-only-query.utils.ts, scripts/database/db-read.ts]
time-to-detect: 2 days
tags: [dsql, gates, meta, cdk, agents]
zone: scripts/database
weak-point: gate-measures-nothing
recurs: none (the earlier gate entries are about a check not running; this one ran and returned the safe-looking value)
---

# The blocklist that was empty because nothing was deployed

## Symptom

ADR-0044 gives an agent a read path into production and keeps it off the tables
that hold credentials, keys and tokens. `scripts/db-read.sh` refuses a query
naming one, and §12.7 of `aws-setup.md` documents the probe:

```
APP=last-loop-lepin scripts/db-read.sh "SELECT 1 FROM admin_sessions"   # refused by the script
```

Run before the production deploy, it was not refused. The script read the
blocklist, found nothing on it, and went on to open a connection.

## Root-cause chain

1. **Why was the table not refused?**
   `readReaderTableBlocklist` returned `[]`, so no table was on the list.
2. **Why was the list empty?**
   It is read from the *deployed* CloudFormation template, and the stack
   deployed at the time was the one from before PR #199. It carried no reader
   at all.
3. **Why did an absent reader read as an empty blocklist?**
   The function returned `string[]`. One value, `[]`, meant both *this
   application blocks no table* and *this stack has no reader to block
   anything*. banana-rush is legitimately the first, so the second could not be
   told apart from a supported state.
4. **Why did the check fail open rather than closed?**
   Nothing decided it should. The function answered the question it was asked —
   which tables are blocked — and had no way to say it could not answer.
5. **Why did the tests not catch it?**
   They were written against hand-built templates that always contained the
   property. The one shape that mattered, a template from before the feature
   existed, is the shape nobody writes a fixture for.

**Root cause:** thought an empty blocklist means nothing is blocked, actually
it also means nothing is deployed — and a guard that cannot distinguish "allow
everything" from "I do not know" has already failed open.

## Detection failure causes

- **Typing:** `string[]` is total. The absence had no representation, so no
  type error was possible.
- **Linter / static analysis:** nothing to see; the code is correct for the
  question it answers.
- **Functional validation locally:** the probe in §12.7 was written as a
  post-deploy step, so running it before the deploy was outside the recipe —
  and running it before the deploy is exactly when the answer is wrong.
- **CI (tests / build):** 100 % coverage and a passing mutation run on the
  file. Both measure the branches that exist; neither asks whether a branch is
  missing.
- **Code review:** the function reads correctly in isolation. The defect is in
  what its return type cannot say.

## Countermeasure

- **Code:** the reading is a discriminated result, and `db-read.ts` refuses
  when the deployed stack carries no reader.
- **Operator action:** none. The production deploy of PR #199 provisioned the
  readers; the probe passes now.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** PR #200 · commit `self`

**The actual fix:** the ambiguous value stops existing.

```diff
-export function readReaderTableBlocklist(template: unknown): string[] {
-  …
-  return [];
-}
+export type ReaderProvisioning =
+  | { readonly provisioned: true; readonly blocklist: string[] }
+  | { readonly provisioned: false };
+
+export function readReaderProvisioning(template: unknown): ReaderProvisioning {
+  …
+    if (!isAReaderRoleName(resource.Properties.readerRoleName)) continue;
+    return { provisioned: true, blocklist: isStringList(blocklist) ? blocklist : [] };
+  …
+  return { provisioned: false };
+}
```

A caller cannot read the blocklist without first handling the case where there
is none, because the field is not there to read:

```diff
+const provisioning = readReaderProvisioning(deployedTemplate);
+if (!provisioning.provisioned) fail(`refused: ${READER_NOT_PROVISIONED_REFUSAL}`, REFUSAL_EXIT_CODE);
```

The marker is `readerRoleName` and not `readerPrincipalArns`. The construct
emits the role name exactly when it maps at least one principal, and it is a
plain string; the principal ARNs reach the deployed template as `Fn::Join`
objects, which the first version of this fix checked for strings and never
matched — on a stack that had just deployed the reader. That shape is pinned in
the tests now.

Verified against the live stacks after PR #199's deploy: pragma refuses
`member_credential` by name, banana-rush passes the guard with its empty
blocklist, and a stack with no reader is refused outright.

## See also

- [`docs/adr/0044-read-only-production-database-access-for-agents.md`](../adr/0044-read-only-production-database-access-for-agents.md)
- [`the-production-database-is-out-of-reach-of-a-hosted-session.md`](../knowledge/the-production-database-is-out-of-reach-of-a-hosted-session.md)
- [`a-generated-file-cannot-contain-its-own-commit.md`](./a-generated-file-cannot-contain-its-own-commit.md)
