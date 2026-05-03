# CloudFront Function throttle state outlives a code update

## Symptom

After fixing the host-routing function (ES5 rewrite, see
[`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md))
and successfully redeploying, every request still returned
`HTTP/2 503` — but with a different cache header:
`x-cache: FunctionThrottledError from cloudfront`. CloudWatch metrics
showed `FunctionThrottles` rising from 0 → 100 % of invocations after
the redeploy, while `FunctionExecutionErrors` had returned to 0.

## Root-cause chain

1. **Why** does CloudFront throttle a working function?
   The `FunctionComputeUtilization` metric is a rolling-window average
   of compute time per invocation, AND elevated error rates count
   toward the throttle decision.
2. **Why** is the metric still elevated after the fix?
   The throttle decision is keyed on the **function name**, not the
   function version. Republishing fresh source overwrites the LIVE
   stage's bytes but doesn't reset the rolling-window state.
3. **Why** is recovery so slow?
   The window is internal to CloudFront and not documented in
   numbers. Empirically, 5–15 min of clean invocations before the
   throttle relaxes; ours took ~10 min.
4. **Why** didn't anything in the stack signal this?
   No CloudWatch alarm, no console banner. The only feedback loop
   was `curl` returning 503 and the `FunctionThrottles` metric
   ticking up alongside `FunctionInvocations`.

**Root cause:** CloudFront's throttle decision is a per-function-name
rolling average that survives a code update, so a brief burst of
errors on a broken version keeps a working version blocked for
several minutes.

## Fix

- **Code:** none. This is a CloudFront-side behaviour we have to
  accept.
- **Operator action:** when a CF Function transitions from broken →
  fixed, expect 5–15 min of `FunctionThrottledError` after the
  successful redeploy. Confirm the new bytes are on LIVE
  (`aws cloudfront get-function --stage LIVE …`) and wait it out.
- **Diagnostic:** poll the metrics in `us-east-1`. The `Sum` of
  `FunctionExecutionErrors` returning to 0 is the leading indicator;
  `FunctionThrottles` lags by ~5–15 min.
  ```bash
  SINCE=$(date -u -v-30M +%Y-%m-%dT%H:%M:%S)
  NOW=$(date -u +%Y-%m-%dT%H:%M:%S)
  for METRIC in FunctionComputeUtilization FunctionThrottles \
                FunctionExecutionErrors FunctionInvocations; do
    aws --region us-east-1 cloudwatch get-metric-statistics \
      --namespace AWS/CloudFront --metric-name "$METRIC" \
      --dimensions Name=FunctionName,Value="$FN_NAME" Name=Region,Value=Global \
      --start-time "$SINCE" --end-time "$NOW" --period 60 \
      --statistics Maximum Sum Average --output table
  done
  ```
- **Last-resort nuclear option:** rename the construct's logical id
  in CDK so CFN destroys the old function and creates a brand-new
  one with a fresh name → fresh metrics. Disruptive (the distribution
  briefly has no associated function); not worth it for a 10-min wait.
