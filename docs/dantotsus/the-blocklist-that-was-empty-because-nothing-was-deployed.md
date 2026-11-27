---
date: 2026-10-27
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#199'
fix-commits: [self]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/agent-reader/index.ts, scripts/database/read-target.utils.ts, scripts/database/db-read.ts]
time-to-detect: 2 days
tags: [dsql, gates, meta, cdk, agents]
zone: scripts/database
weak-point: gate-measures-nothing
recurs: none (the earlier gate entries are about a check not running; this one ran and returned the safe-looking value)
---

# The blocklist that was empty because nothing was deployed

## User impact

ADR-2026-10-25T0054 gives an agent a read path into production and keeps it off the tables that hold credentials, keys and tokens. Its guard let a credential table through when it ran before the deploy. Whether the connection it then opened could read the table was not tested.

| | Seen | Expected |
| --- | --- | --- |
| `APP=last-loop-lepin scripts/db-read.sh "SELECT 1 FROM admin_sessions"`, run before the prod deploy of PR #199 | Not refused. The script found an empty blocklist and opened a connection. | `refused`, as §12.7 of `aws-setup.md` documents |

Found by running the probe locally, two days after the code merged.

## Causal chain

- The probe on `admin_sessions` was not refused.
  - `readReaderTableBlocklist` returned `[]`, so no table was on the list.
    - It read the deployed CloudFormation template. The stack deployed then predated PR #199 and carried no reader.
      - The function had one value for two states. `3bd18b51f` wrote it:

        ```ts
        export function readReaderTableBlocklist(template: unknown): string[] {
          …
          return [];   // ← "blocks no table" and "no reader deployed" alike
        }
        ```

        - banana-rush legitimately blocks no table, so `[]` was a supported answer, and an absent reader looked like it.
        - The same commit returns a discriminated result from `decideReadTarget`, a few lines below, with `accepted: false` and a reason. The writer knew the shape and framed this function as "which tables are blocked", whose natural answer is a list (Man).

## Root cause of occurrence

*Thought an empty blocklist means nothing is blocked. Actually it also means nothing is deployed, and a guard that cannot tell "allow everything" from "I do not know" has already failed open.* (Man)

The commit's author of record is the operator, and the code was written in an agent session (inferred from the repository's workflow; the transcript was not read). The right pattern sat in the same file, so the cause is not a missing example. The question's framing won over it. Source: `git show 3bd18b51f`, `scripts/database/read-target.utils.ts`.

## Detection failure causes

- **Typing:** `string[]` is total. The absence had no representation, so no type error was possible.
- **Linter:** the code is correct for the question it answers.
- **Local validation:** §12.7 wrote the probe as a post-deploy step. Running it before the deploy was outside the recipe, and that is exactly when the answer is wrong.
- **Tests:** they used hand-built templates that always held the property. A template from before the feature existed is the shape nobody writes a fixture for.
- **CI:** 100% coverage and a passing mutation run on the file. Both measure the branches that exist, and neither asks whether one is missing.
- **Review:** the function reads correctly alone. The defect is in what its return type cannot say.

## Countermeasure

The reading became a discriminated result, and `db-read.ts` refused when the deployed stack carried no reader. The prod deploy of PR #199 then provisioned the readers. Verified against the live stacks. Pragma refused `member_credential` by name, banana-rush passed with its empty blocklist, and a stack with no reader was refused outright.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file, in PR #202.

The ambiguous value stops existing.

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
plain string. The principal ARNs reach the deployed template as `Fn::Join`
objects, which the first version of this fix checked for strings and never
matched, on a stack that had just deployed the reader. That shape was pinned in
the tests until the reading moved.

ADR-2026-10-28T2126 moved the assessment out of the calling script and into each
application's reader Lambda, so the reading above no longer exists in that
shape. The property it defended survives in a stronger form. The blocklist is
an environment variable the construct sets at synth time from the same list the
schema enforces, so there is no template to parse and no empty answer to
mistake for an empty blocklist. A stack whose reader was never deployed
publishes no `AgentReaderFunctionName` output, and `db-read.ts` refuses on that
absence before it invokes anything (read today, `scripts/database/db-read.ts:67-77`). It is the same refusal, keyed on a fact that cannot be ambiguous.

**Proof it can fail:** the live probe above. A stack with no reader was refused outright, where the first version opened a connection.

**Similar instances:** the reader Lambda reads its blocklist with `process.env[BLOCKLIST_VARIABLE] ?? ''` (`infra/cdk/src/internal/agent-reader/index.ts:46`), where every other variable goes through `requireEnvironment`, which throws. The construct always sets the variable (`dsql-agent-reader.ts:97`), so this is not reachable through a deploy today. It is the same empty-means-two-things shape, kept harmless by the construct (measured).
