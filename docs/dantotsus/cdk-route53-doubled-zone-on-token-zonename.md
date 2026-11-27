---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#12'
fix-commits: [902c4b7215]
eradication-level: 5
eradication-paths: [docs/knowledge/cdk-route53-zone-token-pitfall.md]
time-to-detect: ~30 minutes (preview API hostname resolved but served the wrong content; only DNS inspection caught the doubled suffix)
tags: [cdk, route53, cloudformation, dns]
zone: infra/cdk/src/constructs/lambda-api.ts
---

# The preview API answered from the wrong CloudFront, because its DNS name ended in .borso.fr twice

## User impact

The last-loop-lepin preview of PR #12 could not reach its API.

| | Seen | Expected |
| --- | --- | --- |
| `https://last-loop-lepin-pr-12-api.preview.borso.fr/api/...` | `server: CloudFront`, `x-cache: FunctionGeneratedResponse from cloudfront`, from the shared previews distribution. The API's log group stayed empty. | The request reaches API Gateway and the Lambda. |

<details>
<summary>Route 53 listing</summary>

```
$ aws route53 list-resource-record-sets --hosted-zone-id Z…
  --query "ResourceRecordSets[?contains(Name,'last-loop-lepin-pr-12-api')]"
[
  { "Name": "last-loop-lepin-pr-12-api.preview.borso.fr.borso.fr.", "Type": "A" },
  { "Name": "last-loop-lepin-pr-12-api.preview.borso.fr.borso.fr.", "Type": "AAAA" }
]
```

</details>

## Causal chain

- The API hostname was answered by the shared previews distribution.
  - No record matched `last-loop-lepin-pr-12-api.preview.borso.fr`, so the wildcard `*.preview.borso.fr` caught the lookup.
    - The A and AAAA records were named `last-loop-lepin-pr-12-api.preview.borso.fr.borso.fr.`.
      - CDK's `determineFullyQualifiedDomainName` appended the zone name, because `recordName` neither ended with a dot nor with `.${zoneName}`.
        - `zoneName` came from SSM through `StringParameter.valueForStringParameter`, so at synth it read `${Token[TOKEN.123]}`. The literal host could not end with that token, and the template asked CloudFormation to join host and zone.
          - `LambdaApi` passed the bare host:

            ```ts
            new ARecord(this, 'DomainAliasA', {
              zone,
              recordName: props.customDomain.hostname, // ← no trailing dot
              target: aliasTarget,
            });
            ```

            - Commit `a1ab4047f` (2026-05-13, an agent) wrote it while wiring a custom domain for preview APIs. `StaticSite` passed a bare name the same way at that time, so the codebase held no example with the dot.
              - The shared stack publishes the zone name in SSM, and every construct reads it as a token. Each construct then builds its own record names by hand (Machine).

## Root cause of occurrence

*Thought CDK compares the record name with the resolved zone name at deploy time, actually it compares at synth time, against an unresolved token, and appends the zone whenever the name lacks a trailing dot.* (Man)

The installed `aws-route53/lib/record-set.d.ts` says of `recordName`:

> This should be relative to the zone root name. … You can also specify the fully qualified domain name which terminates with a ".". For example, "acme.example.com.".

## Detection failure causes

- **Typing:** `recordName: string` takes a relative name and a full one alike.
- **Linter:** no rule reads Route 53 record names.
- **Local synth:** the template showed `Fn::Join` of the host, the SSM reference and a dot. Nobody read it.
- **CI:** the tests asserted the API Gateway `DomainName` and the record count, not the record's `Name`.
- **Review:** the same session wrote and reviewed the change.

## Countermeasure

Commit [`902c4b7`](https://github.com/hugoleborso/borso.fr/commit/902c4b7215) appends a trailing dot to the API host in `infra/cdk/src/constructs/lambda-api.ts`, so CDK leaves the name alone. The record now resolves to the right host. Commit `3df59de` did the same in `StaticSite`, whose bare name had already doubled prod records (`r53-arecord-relative-recordname-doubles-zone.md`, which recurs this entry).

## Eradication

**Type:** knowledge (level 5)

**Reference:** `docs/knowledge/cdk-route53-zone-token-pitfall.md`, triggered on `lambda-api.ts`, `static-site.ts`, `photos-cdn.ts`, `shared-stack.ts`, and on output matching `\.borso\.fr\.borso\.fr`.

The fix lives in three copies of `FULLY_QUALIFIED_DOMAIN_SUFFIX = '.'`, in `static-site.ts`, `lambda-api.ts` and `photos-cdn.ts`. `static-site.test.ts` and `photos-cdn.test.ts` assert the record `Name` with its trailing dot. Nothing asserts it for `LambdaApi`: `lambda-api.test.ts` and `previewable-app.test.ts` only count two `AWS::Route53::RecordSet`. The unit test this entry cited in `previewable-app.test.ts` never checked the name. A new construct that writes `new ARecord` with a bare host would repeat the defect.

The entry once rejected a shared helper because there were two callers. There are three now.

**Proposed:** add one internal function in `infra/cdk/src/internal/` that creates the A and AAAA alias records for a host and appends the trailing dot itself, used by the three constructs. Refuse a direct `ARecord` or `AaaaRecord` outside it with a rule under `eslint-rules/`, enabled in `.oxlintrc.json`. A record name could then not reach CDK without its dot.

**Proof it can fail:** none for `LambdaApi`. No check exists to plant against.

**Similar instances:** `grep -rn "new ARecord\|new AaaaRecord" infra apps --include=*.ts` finds the three constructs and `infra/shared/lib/shared-stack.ts`.
