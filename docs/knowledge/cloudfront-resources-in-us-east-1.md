---
date: 2026-05-02
introduced-at: n/a-vendor-knowledge
detected-at: operator-deploy
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: n/a (vendor constraint; the fix is operator awareness)
time-to-detect: minutes (first cloudfront API call from the wrong region)
tags: [cloudfront, aws-cli, region-pinning, vendor-quirk]
---

# CloudFront resources are global; the API endpoint is `us-east-1`

## Symptom

Trying to inspect or test the host-routing CloudFront Function with
`aws cloudfront describe-function` in our default region
(`eu-west-3`) returned `NoSuchFunctionExists`. Same for
`list-functions`, `test-function`, and looking up the function's
CloudWatch log group — the log group
`/aws/cloudfront/function/<name>` was nowhere in eu-west-3.

User impact (operator-facing): every diagnostic ran with no obvious
flag had to be retried; the "resource doesn't exist" reads as
"deploy is broken" rather than "wrong region".

## Root-cause chain

1. **Why?** `describe-function` says the function doesn't exist.
   Because CloudFront is a global service whose control-plane API
   endpoint only exists in `us-east-1`, even though distributions
   serve traffic worldwide.
2. **Why are the CloudWatch logs in `us-east-1` too?**
   CloudFront Functions emit `console.log` output and execution
   metrics to CloudWatch in `us-east-1` regardless of where the
   distribution's edge POPs are. The control plane writes them
   there because that's the home of the global service.
3. **Why doesn't AWS surface this in the eu-west-3 console?**
   Because the resources literally don't exist in eu-west-3.
   Region-pinned commands return "not found" instead of
   "wrong-region", so there's no helpful guidance.

**Root cause:** we thought eu-west-3 (our default region) was the
correct target for any CloudFront-related command in this account.
Actually CloudFront's control plane is region-pinned to `us-east-1`,
and any CLI/console interaction with functions, logs, or metrics
must target that region — not the data-plane region of the
distribution.

## Detection failure causes

- **Operator-deploy:** detection happened on the first
  `cloudfront list-functions` invocation from a session whose
  default region was eu-west-3. Could have been preempted by a
  short note in the diagnostic snippets we wrote.

## Countermeasure

- **Code:** none — vendor constraint.
- **Operator pattern:** always pass `--region us-east-1` when
  running:
  - `aws cloudfront list-functions / describe-function /
    get-function / test-function`
  - `aws logs tail /aws/cloudfront/function/<name>`
  - `aws cloudwatch get-metric-statistics --namespace AWS/CloudFront`
    (use `Region=Global` for the dimension, but call the API in
    `us-east-1`).

## Eradication

- **Sibling defects swept:** ACM wildcard certs for CloudFront also
  live in `us-east-1` — already enforced by AWS, not by us.
  `infra/shared/lib/certs-stack.ts` is region-pinned accordingly.
- **Tooling change:** every diagnostic snippet in `docs/knowledge/`
  for CloudFront Functions explicitly passes `--region us-east-1`.
  An `AWS_DEFAULT_REGION_OVERRIDE_FOR_CF=us-east-1` shell wrapper
  could automate it; not worth the complexity.
- **Detection improvement:** none.
- **Knowledge sharing:** this entry; the file header in
  `cf-host-routing-function.code.js` mentions the constraint;
  CLAUDE.md's gotchas section calls it out.
