# CloudFront resources are global but the API endpoint is `us-east-1`

## Symptom

Trying to inspect or test the host-routing CloudFront Function with
`aws cloudfront describe-function` (or `test-function`, or `list-functions`)
in our default region (`eu-west-3`) returned
`NoSuchFunctionExists`. Same for fetching CloudFront Function
CloudWatch logs — the log group `/aws/cloudfront/function/<name>`
didn't appear in the eu-west-3 CloudWatch console.

## Root-cause chain

1. **Why** does `describe-function` say the function doesn't exist?
   CloudFront is a global service. Its control-plane API endpoint
   only exists in `us-east-1`, even though distributions serve
   traffic worldwide.
2. **Why** are the CloudWatch logs in `us-east-1` too?
   CloudFront Functions emit their `console.log` output and
   execution metrics to CloudWatch in `us-east-1` regardless of
   where the distribution's edge POPs serve. The control plane
   writes them there because that's the home of the global CF
   service.
3. **Why** doesn't AWS surface this in the eu-west-3 console?
   Because the resources literally don't exist in eu-west-3.
   Region-pinned commands return "not found" instead of
   "wrong-region".

**Root cause:** CloudFront's control plane is region-pinned to
`us-east-1`, and any CLI/console interaction (function APIs, logs,
metrics) must target that region — not the data-plane region of the
distribution.

## Fix

- **Code:** none — this is a CloudFront fact of life.
- **Operator action:** always pass `--region us-east-1` when running:
  - `aws cloudfront list-functions / describe-function / get-function / test-function`
  - `aws logs tail /aws/cloudfront/function/<name>`
  - `aws cloudwatch get-metric-statistics --namespace AWS/CloudFront`
    (use `Region=Global` for the dimension, but call the API in
    `us-east-1`).
- **Verify a function is what you think it is:**
  ```bash
  aws --region us-east-1 cloudfront get-function \
    --name "$FN_NAME" --stage LIVE /tmp/cf-fn.js
  cat /tmp/cf-fn.js
  ```
  See [`cloudfront-get-function-binary-output.md`](./cloudfront-get-function-binary-output.md)
  for why `get-function` doesn't print to stdout.

## Related

- ACM wildcard certs for CloudFront also live in `us-east-1` —
  enforced by AWS, not by us. `infra/shared/lib/certs-stack.ts`
  is region-pinned accordingly.
