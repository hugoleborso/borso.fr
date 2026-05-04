# CloudFront aliases (CNAMEs) are unique account-wide and must be released before being claimed by a different distribution

## Symptom

`cdk deploy` (or any CloudFormation/manual `CreateDistribution` / `UpdateDistribution`) returns:

```
AWS::CloudFront::Distribution: One or more of the CNAMEs you provided are already
associated with a different resource. (Service: CloudFront, Status Code: 409,
Request ID: …)
```

…even though the new stack is being created cleanly and the alias is one your account already controls.

## Why

CloudFront's invariant: **at most one distribution can list a given alias (Aliases.Items entry) at any time**, account-wide. The constraint is not unique to creation — it applies to any update that adds an alias already claimed elsewhere. CloudFront does *not* offer a "transfer" or "reassign" operation; the only way to move an alias from one distribution to another is to remove it from the first, wait for that change to propagate, then add it to the second.

## Concrete recovery

For the case where distro `OLD_ID` currently holds `<host>` and you want to release it so a new distribution can claim it:

```bash
ETAG=$(aws cloudfront get-distribution-config --id "$OLD_ID" --query 'ETag' --output text)
aws cloudfront get-distribution-config --id "$OLD_ID" \
  --query 'DistributionConfig' > /tmp/old-config.json

# Remove ALL aliases (the simplest path; replace .Aliases with the trimmed set if you only need to drop some).
jq '.Aliases = {Quantity: 0}' /tmp/old-config.json > /tmp/old-config-no-alias.json

aws cloudfront update-distribution \
  --id "$OLD_ID" \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/old-config-no-alias.json

# Wait for Status=Deployed (5–15 min). Until then, the alias is still locked.
until [ "$(aws cloudfront get-distribution --id "$OLD_ID" --query 'Distribution.Status' --output text)" = "Deployed" ]; do sleep 30; done
```

Now the new deploy can claim `<host>`.

## Caveats

- **DNS continues to point at the old distribution** until you update the Route53 ARecord. If the spec only removes the alias from CloudFront's config but leaves DNS, traffic 404s at the old distribution (which now answers "no such alias") until DNS flips. Sequence: release alias → deploy new → flip DNS → verify → decommission old.
- **The 5–15 min propagation wait is not optional.** A deploy retried before propagation completes returns the same 409.
- **`cdk diff` cannot foresee this** — it only diffs against CloudFormation state, not against live CloudFront state owned by other distributions.
- **This is the correct constraint for security**: it prevents a hostile actor from hijacking a CNAME by spinning up a distribution claiming the same alias.

## Don't

- Don't try to delete the old distribution before releasing its alias — `DeleteDistribution` requires the distribution to be Disabled first, which is a longer dance than just removing the alias. If your only goal is to free the alias, just remove it.
- Don't pre-create the cert in a way that locks it to the old distribution — CDK in this repo creates a per-stage cert; the alias-uniqueness rule is independent of the cert.

## See also

- [`docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md`](../dantotsus/cloudfront-cname-must-be-released-before-redeploy.md) — Dantotsu that pulled in the preflight script eradication.
- [`docs/knowledge/cloudfront-resources-in-us-east-1.md`](./cloudfront-resources-in-us-east-1.md) — a sister vendor constraint on CloudFront control-plane region.
