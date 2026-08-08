# CDK Route 53: trailing-dot `recordName` when the zone is a CFN token

## The trap

`aws-route53.ARecord` (and its siblings) calls
`determineFullyQualifiedDomainName(name, zone)` on every record at
synth time. The function:

1. If `name` ends with `.`, return it verbatim (FQDN).
2. Else if `name` ends with `.${zoneName}`, return it verbatim.
3. Else append `.${zoneName}`.

When `zone` is constructed from
`HostedZone.fromHostedZoneAttributes({ zoneName: <SSM token> })`, the
`zoneName` at synth time reads as `${Token[TOKEN.123]}`. The suffix
check (step 2) compares the literal `name` string against the
unresolved token string — never matches — and falls through to
step 3, emitting:

```yaml
Name:
  Fn::Join:
    - ""
    - - "<your hostname>."
      - { Ref: "SsmParameterValueborso.../HostedZoneName" }
      - "."
```

At deploy time CFN resolves that to `<your hostname>.borso.fr` and
the record ends up as `<your hostname>.borso.fr.borso.fr`. Resolver
never finds the intended hostname; if a wildcard ALIAS sits on the
parent zone, it catches the lookup instead.

## Rule of thumb

If you pass `zoneName` from SSM (or any CFN reference), always
trailing-dot your `recordName`:

```ts
new ARecord(this, 'Alias', {
  zone,
  recordName: `${hostname}.`,          // ← trailing dot wins, every time
  target: aliasTarget,
});
```

The trailing dot tags `recordName` as an FQDN so step 1 short-
circuits before the broken suffix check ever runs.

## When to use the literal form instead

If you have the zone name as a literal `string` (e.g.
`HostedZone.fromHostedZoneAttributes({ zoneName: 'borso.fr', … })`),
the suffix check works and you can omit the trailing dot. The
trailing-dot pattern is harmless in that case too, so making it the
repo-wide convention is safe.

## Origin

Surfaced during PR #12 while wiring per-PR custom domains for
preview APIs. The bug manifested as
`server: CloudFront` on requests that should have hit API Gateway
— Route 53 had emitted records with `.borso.fr.borso.fr` and the
wildcard `*.preview.borso.fr` ALIAS on the shared previews
distribution was catching the lookup.

Full dantotsu:
[`docs/dantotsus/cdk-route53-doubled-zone-on-token-zonename.md`](../dantotsus/cdk-route53-doubled-zone-on-token-zonename.md).

## See also

- [`preview-api-cross-origin.md`](./preview-api-cross-origin.md) —
  context for why the per-PR API hostname exists.
- AWS CDK source: `aws-cdk-lib/aws-route53/lib/util.ts` —
  `determineFullyQualifiedDomainName`.
