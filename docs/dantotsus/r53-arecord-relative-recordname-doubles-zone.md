---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: none (present since the StaticSite construct was first written)
fix-commits: [3df59de902]
eradication-level: 4
eradication-paths: [infra/cdk/test/unit/static-site.test.ts, infra/cdk/test/unit/photos-cdn.test.ts, docs/knowledge/cdk-route53-zone-token-pitfall.md]
time-to-detect: ~10 days
tags: [cdk, route53, cloudfront, static-site, drift]
zone: infra/cdk/src/constructs/static-site.ts
recurs: [cdk-route53-doubled-zone-on-token-zonename]
---

# The DNS record that pointed nowhere: CDK's relative recordName trap

## User impact

`https://borso.fr` answered 200, so no visitor saw a failure. The operator, on a
CloudFront cost audit, found the CDK stack's DNS records under the wrong name,
while a hand-made record and a second distribution, certificate and WAF did the
real work and kept billing.

<details><summary>Route 53 listing (operator, 2026-05-14)</summary>

```text
$ aws route53 list-resource-record-sets --hosted-zone-id Z040…
{ "Name": "borso.fr.",          "Type": "A",    "AliasTarget": { … d2kjwt…cloudfront.net (E80907R476ZAJ, manual) … } }
{ "Name": "borso.fr.borso.fr.", "Type": "A",    "AliasTarget": { … d3cets…cloudfront.net (E25779EK6PTEZ2, CDK)   … } }
{ "Name": "borso.fr.borso.fr.", "Type": "AAAA", "AliasTarget": { … d3cets…cloudfront.net (E25779EK6PTEZ2, CDK)   … } }
```

</details>

| | Seen | Expected |
| --- | --- | --- |
| CDK-owned records for `borso-fr-prod` | `borso.fr.borso.fr.` A and AAAA | `borso.fr.` A and AAAA |
| Who serves the apex | a hand-made record pointing at a second, billed distribution | the CDK distribution, alone |

The `borsouvertures-prod` stack would have produced
`borsouvertures.borso.fr.borso.fr.` the same way.

## Causal chain

- The CDK stack owned `borso.fr.borso.fr.` records and no `borso.fr.` record.
  - CDK synthesised the record name `borso.fr` + `.borso.fr.`.
    - `determineFullyQualifiedDomainName` in `aws-cdk-lib/aws-route53/lib/util.js`
      appends `.${zoneName}.` unless the name ends with a dot, ends with the
      zone name, or equals it. The zone name was a token, so neither comparison
      could match.
      - The construct read the zone name from SSM at deploy time and passed
        the domain without a trailing dot.

        ```ts
        const zoneName = StringParameter.valueForStringParameter(this, SHARED_SSM.hostedZoneName); // a token at synth
        const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', { hostedZoneId: zoneId, zoneName });
        new ARecord(this, 'AliasA', {
          zone,
          recordName: props.domainName, // ← ❌ 'borso.fr', compared against a token
        ```

        - 1aa979e74 (2026-05-01) wrote these lines, porting the constructs from
          `hugoleborso/borso-platform`.

## Root cause of occurrence

*Thought `recordName: 'borso.fr'` in zone `borso.fr` names the apex, actually CDK
recognises an apex or a full name only when it can read the zone name at synth.
A zone name read from SSM is a token, so CDK treats every name as relative and
appends the zone.* (Material)

The writer was an agent porting code. CDK's own API is the misleading material.
`recordName` accepts both forms and picks one by a string comparison that fails
silently on a token. Its doc comment, in `aws-route53/lib/record-set.d.ts`, says:
"This should be relative to the zone root name … You can also specify the fully
qualified domain name which terminates with a '.'". It does not say that a full
name without the dot works only when the zone name is a literal. Whether the
original in `borso-platform` read its zone from a literal is unverified.

## Detection failure causes

- **Typing:** `recordName` is `string | undefined`. Relative against absolute is
  a trailing dot, which no type carries.
- **Linter:** no rule looked at `recordName`.
- **CI:** the `infra/cdk` suite asserted bucket, error-response and OAC
  properties, never the record `Name`.
- **Review:** `recordName: props.domainName` reads as correct English.
- **Monitoring:** `curl https://borso.fr` stayed 200. CloudFront routes by SNI,
  so the edge sent `borso.fr` to the CDK distribution, which declared the alias,
  whatever the Route 53 record pointed at. Only the bill surfaced the drift.

## Countermeasure

3df59de90 normalises `props.domainName` to one trailing dot before it reaches
`ARecord` and `AaaaRecord`, idempotent for a name that already ends with a dot.
The live phantom records, the manual distribution, its certificate and WAF were
reconciled by `scripts/migrate-static-sites-to-cdk.sh` (commit 9109730), plus
one console step.

## Eradication

**Type:** detection (level 4)

**Reference:** commit 3df59de90.

What holds today:

- `infra/cdk/test/unit/static-site.test.ts` asserts `Name: 'borso.fr.'` and that
  the template contains no `borso.fr.borso.fr`, for the apex, a subdomain and an
  already-absolute name.
- `infra/cdk/test/unit/photos-cdn.test.ts` asserts the exact name for
  `PhotosCdn`.
- `docs/knowledge/cdk-route53-zone-token-pitfall.md` is printed when an agent
  edits one of the four construct files.

Each test covers one construct. A new `ARecord` callsite is covered by nothing.
The 2026-05-14 entry said to escalate if a second callsite appeared. It
appeared the same day in `lambda-api.ts`, recorded in
[`cdk-route53-doubled-zone-on-token-zonename.md`](./cdk-route53-doubled-zone-on-token-zonename.md).
`lambda-api.ts` has no record-name test today.

**Proposed:** subtract the three copies of the normalisation. Add one
`aliasRecords(scope, { zone, hostname, target })` helper in
`infra/cdk/src/internal/` that takes a fully qualified hostname, appends the dot
itself, and creates both the A and the AAAA record. `static-site.ts`,
`photos-cdn.ts` and `lambda-api.ts` call it and lose their own
`FULLY_QUALIFIED_DOMAIN_SUFFIX`. One test covers the helper. Then a rule under
`eslint-rules/` refuses `recordName:` on `ARecord` and `AaaaRecord` outside the
helper, so no new callsite can pass a name CDK will reinterpret.
`shared-stack.ts` passes the relative `'*.preview'` into a zone from
`HostedZone.fromLookup`, whose name is a literal, and would move to the helper
with `'*.preview.borso.fr'`. None of this exists yet.

**Proof it can fail:** reverting the normalisation in `static-site.ts` fails the
three `static-site.test.ts` cases (3df59de90 added them against the reverted
line).

**Similar instances:** `grep -rn "new ARecord" infra --include=*.ts | grep -v test`
finds four callsites: `static-site.ts:219`, `photos-cdn.ts:98`,
`lambda-api.ts:206` and `infra/shared/lib/shared-stack.ts:136`. The first three
each carry their own copy of the trailing-dot normalisation.
