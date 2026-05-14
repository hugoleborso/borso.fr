---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-commits: [902c4b7]
eradication-level: 4
time-to-detect: ~30 minutes (preview API hostname resolved but served the wrong content; only DNS inspection caught the doubled suffix)
tags: [cdk, route53, cloudformation, dns]
---

# Route 53 record with `.borso.fr.borso.fr` after CDK appended the zone twice

## Symptom

After the API custom-domain wiring landed, hitting
`https://last-loop-lepin-pr-12-api.preview.borso.fr/api/...` did NOT
reach API Gateway. Response headers showed `server: CloudFront`,
`x-cache: FunctionGeneratedResponse from cloudfront` — the request was
being served by the *shared previews* CloudFront distribution (the
wildcard `*.preview.borso.fr` ALIAS), not by the API Gateway custom
domain. CloudWatch's API log group stayed empty.

Inspecting Route 53:

```
$ aws route53 list-resource-record-sets --hosted-zone-id Z…
  --query "ResourceRecordSets[?contains(Name,'last-loop-lepin-pr-12-api')]"
[
  { "Name": "last-loop-lepin-pr-12-api.preview.borso.fr.borso.fr.", "Type": "A" },
  { "Name": "last-loop-lepin-pr-12-api.preview.borso.fr.borso.fr.", "Type": "AAAA" }
]
```

The record name had `.borso.fr` twice. Resolver never matched the
intended hostname; the wildcard caught the lookup.

## Root-cause chain

1. **Why did the record include `.borso.fr` twice?**
   `ARecord` constructed with
   `recordName: "last-loop-lepin-pr-12-api.preview.borso.fr"` plus a
   `HostedZone` whose `zoneName` was a CFN token — CDK appended the
   zoneName to recordName.
2. **Why did CDK append?**
   `aws-route53` calls `determineFullyQualifiedDomainName(name, zone)`
   on every record. The function strips the trailing dot if present;
   otherwise it checks whether `name` ends with `.${zoneName}` — if yes,
   leave it alone; if no, append `.${zoneName}`.
3. **Why did the suffix check fail?**
   `zoneName` was a CFN intrinsic resolved at deploy-time (we read
   `/borso/shared/hosted-zone-name` via
   `StringParameter.valueForStringParameter`). At synth time `zoneName`
   reads as `${Token[TOKEN.123]}`. The literal string
   `"last-loop-lepin-pr-12-api.preview.borso.fr"` does not end with
   `".${Token[TOKEN.123]}"` so CDK appended the unresolved token. At
   deploy time CFN resolved the token → final name became
   `last-loop-lepin-pr-12-api.preview.borso.fr.borso.fr`.
4. **Why did we use a token zoneName?**
   The shared infra puts the zone name in SSM so per-app stacks don't
   re-declare it. Convention applied to every Route 53 caller in the
   repo, including `StaticSite` — but `StaticSite` only got away with
   it for existing prod records because those were created before this
   pattern existed.

**Root cause:** *I thought CDK's "endsWith zone" auto-FQDN logic
worked on the resolved value at deploy time. Actually it runs at
synth time on the literal token, fails the suffix check, and emits a
template that asks CFN to concatenate token + already-FQDN name.* If
I had known that, every `recordName` would have been a trailing-dot
FQDN from day one.

## Detection failure causes

- **Typing:** `recordName: string` accepts both bare-host and FQDN
  forms; nothing in the type system catches the auto-append.
- **Linter / static analysis:** repo has no rule about Route 53
  record names.
- **Functional validation locally:** the CFN template inspected at
  synth time shows the Fn::Join intrinsic — `Name: { "Fn::Join": ["",
  [ "last-loop-lepin-pr-12-api.preview.borso.fr.", { "Ref": "Ssm…" },
  "." ]] }` — but I didn't read the synthesised template; the structure
  is opaque without running it through CFN.
- **CI (tests / build):** infra unit tests assert on `DomainName:
  'last-loop-lepin-pr-12-api.preview.borso.fr'` at the APIGW level,
  not on the Route 53 record's final assembled name. The token form is
  the same regardless.
- **Code review:** same session shipped both sides, didn't read the
  synth template.

## Countermeasure

`infra/cdk/src/constructs/lambda-api.ts` — every `recordName` is now
constructed as `\`${hostname}.\`` (trailing dot = FQDN sentinel) so
`determineFullyQualifiedDomainName` short-circuits regardless of how
`zoneName` resolves at synth.

## Eradication (mandatory — code-level)

**Type:** code diff + assertion (level 4 — detection)

The structural impossibility ladder (level 1) would require either a
custom `route53Record` helper in `@borso/infra` that always appends the
trailing dot, or a Biome plugin that rejects `recordName: <expr>` calls
without a trailing-`.`. Both are heavier than the surface area justifies
right now — we have two callers (`StaticSite`, `LambdaApi`). The
detection layer below makes the misconfiguration visible during synth:

1. The deployed `lambda-api.ts` writes the FQDN-with-trailing-dot
   literal so the synthesised template's `Name` field is a bare string
   (`"last-loop-lepin-pr-12-api.preview.borso.fr."`) — verifiable via
   `cdk synth` output.
2. A targeted unit test in `previewable-app.test.ts` asserts the API's
   Route 53 records resolve to the un-doubled FQDN.

**Reference:** [PR #12](https://github.com/hugoleborso/borso.fr/pull/12) ·
commit [`902c4b7`](https://github.com/hugoleborso/borso.fr/commit/902c4b7)

**The actual fix:**

```diff
-      new ARecord(this, 'DomainAliasA', {
-        zone,
-        recordName: props.customDomain.hostname,
-        target: aliasTarget,
-      });
-      new AaaaRecord(this, 'DomainAliasAAAA', {
-        zone,
-        recordName: props.customDomain.hostname,
-        target: aliasTarget,
-      });
+      // Trailing dot tags the recordName as an FQDN so CDK's
+      // `determineFullyQualifiedDomainName` short-circuits and does NOT
+      // append the zone name. Without it, when `zoneName` is a CFN token
+      // (from SSM, as it is here), CDK's suffix check fails and the
+      // record ends up as `<hostname>.${zoneName}` → `last-loop-lepin-
+      // pr-12-api.preview.borso.fr.borso.fr` in Route 53, which loses the
+      // ALIAS race against the wildcard `*.preview.borso.fr` record on
+      // the shared previews distribution.
+      const fqdn = `${props.customDomain.hostname}.`;
+      new ARecord(this, 'DomainAliasA', { zone, recordName: fqdn, target: aliasTarget });
+      new AaaaRecord(this, 'DomainAliasAAAA', { zone, recordName: fqdn, target: aliasTarget });
```

**Sibling defects swept:** `StaticSite` has the same pattern with
`recordName: props.domainName`. Prod records work today because they
were created before SSM-tokenized zones; a re-deploy would re-emit with
the doubled suffix. Captured as follow-up in
[`docs/knowledge/cdk-route53-zone-token-pitfall.md`](../knowledge/cdk-route53-zone-token-pitfall.md)
so the next StaticSite touch reuses the trailing-dot pattern.

## See also

- [`docs/knowledge/cdk-route53-zone-token-pitfall.md`](../knowledge/cdk-route53-zone-token-pitfall.md)
- [`docs/knowledge/preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md)
  — context for why the API record exists at all.
