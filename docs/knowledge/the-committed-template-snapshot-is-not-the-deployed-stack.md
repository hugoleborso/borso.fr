# The committed template snapshot is not the deployed stack

`infra/shared/test/unit/__snapshots__/borso-shared.template.json` is
the review artefact for every change to the shared stack, and
CLAUDE.md is right that reading its diff is how you know what a deploy
will do. It is **not** a copy of what is deployed, and comparing the
two directly produces phantom findings.

## What the snapshot is synthesized from

`shared-stack.test.ts` synthesizes with stubs: account
`123456789012`, hosted zone `Z1FAKE`, budget email
`hugo@example.com`, and certificates via
`Certificate.fromCertificateArn` inside a separate `CertsStub` stack.

The stubbed certificates are the one that bites. Because the synth
under test never creates a genuine cross-region reference, it never
emits the machinery that supports one. Diffing the snapshot against
the live template on 2026-08-20 showed three resources present in
production and absent from the snapshot:

```
ExportsReader8B249524
CustomCrossRegionExportReaderCustomResourceProviderHandler46647B68
CustomCrossRegionExportReaderCustomResourceProviderRole10531BBD
```

Read naively, that says the next deploy deletes the machinery that
reads the us-east-1 certificate exports. The deploy ran and deleted
nothing. They were an artefact of the stubbing. `CDKMetadata` is a
fourth, benign, difference.

## What the comparison *is* good for

Resource-set comparison found something real that the snapshot diff of
a single pull request cannot show: **accumulated undeployed drift.**
`Budget2` (`borso-monthly-2usd`, from PR #61, merged 2026-08-18) was
in the snapshot and not in the live stack, because `shared-deploy` is
`workflow_dispatch`-only and nobody had dispatched it in two days. The
deploy that shipped the `nodejs22.x` → `nodejs24.x` runtime change
shipped that budget with it.

That is worth knowing before every dispatch: **the diff of one pull
request tells you what that pull request changes; it does not tell you
what the pending deploy will do**, because the stack may be several
merges behind.

## How to check drift honestly

Compare resource sets, not bytes, and treat differences that trace to
a stub as unproven rather than as findings:

```bash
aws cloudformation get-template --stack-name borso-shared \
  --region eu-west-3 --query TemplateBody --output json > /tmp/deployed.json
# then compare {logicalId: Type} maps against the snapshot
```

For the authoritative answer, dispatch `shared-deploy` with
`action: diff` first. CDK's own diff resolves against the real synth,
with real certificates, and settles what a resource-set comparison
can only raise.

## See also

- [`an-approval-gate-that-only-existed-in-a-comment.md`](../dantotsus/an-approval-gate-that-only-existed-in-a-comment.md)
  — why the snapshot stands in for a gate on this workflow.
