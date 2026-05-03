---
date: 2026-05-02
introduced-at: n/a-vendor-knowledge
detected-at: production
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: n/a (vendor behaviour; nothing to fix)
time-to-detect: minutes per affected request, ~10 min total recovery
tags: [cloudfront, edge-runtime, throttling, vendor-quirk]
---

# A CloudFront Function's throttle state outlives a code update

## Symptom

After fixing the host-routing function with the ES5 rewrite (see
[`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md))
and successfully redeploying, every request still returned
`HTTP/2 503` — but with a different cache header:
`x-cache: FunctionThrottledError from cloudfront`. CloudWatch
metrics in `us-east-1` showed `FunctionThrottles` rising from 0 →
100 % of invocations after the redeploy, while
`FunctionExecutionErrors` had returned to 0.

User impact: visitors continued to see CloudFront error pages for
~10 min after the operator believed the fix was live.

## Root-cause chain

1. **Why?** CloudFront throttles a working function.
   Because the `FunctionComputeUtilization` metric is a rolling-
   window average that combines compute time and elevated error
   rates into the throttle decision.
2. **Why is the metric still elevated after the fix?**
   The throttle decision is keyed on the **function name**, not the
   function version. Republishing fresh source overwrites the LIVE
   stage's bytes but doesn't reset the rolling-window state.
3. **Why is recovery so slow?**
   The window is internal to CloudFront and not documented in
   numbers. Empirically: 5–15 min of clean invocations before the
   throttle relaxes.
4. **Why doesn't anything in the AWS stack signal this?**
   No CloudWatch alarm preset, no console banner. The only feedback
   loop is `curl` returning 503 and `FunctionThrottles` ticking up
   alongside `FunctionInvocations`.

**Root cause:** we thought republishing a CF Function reset its
runtime state. Actually CloudFront's throttle decision is a
per-function-name rolling average that survives a code update — a
brief burst of errors on a broken version keeps a working version
blocked for several minutes.

## Detection failure causes

- **Functional validation locally:** the symptom is an AWS-side
  rate-limiter; nothing local would simulate it.
- **CI:** no integration test against a real CloudFront edge.
- **Production monitoring:** no alarm on `FunctionThrottles`. Adding
  one would have alerted Hugo to the residual state immediately
  after the redeploy.

## Countermeasure

- **Code:** none. This is CloudFront-side behaviour we accept.
- **Operator action:** when a CF Function transitions from broken →
  fixed, expect 5–15 min of `FunctionThrottledError` after the
  successful redeploy. Confirm the new bytes are on LIVE
  (`aws cloudfront get-function --stage LIVE …`) and wait it out.
- **Diagnostic loop:**
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

## Eradication

- **Sibling defects swept:** only one CF Function in the repo today.
- **Tooling change:** none — the throttle is AWS-side and not
  configurable.
- **Detection improvement:** add a CloudWatch alarm in `us-east-1`
  on `FunctionThrottles > 0 for 5min`, alarming during the recovery
  window. Captured as follow-up; not added.
- **Last-resort nuclear option:** rename the construct's logical id
  in CDK so CFN destroys the old function and creates a brand-new
  one with a fresh name → fresh metrics. Disruptive (the
  distribution briefly has no associated function); not worth it
  for a 10-min wait.
- **Knowledge sharing:** this entry; cross-link from the runtime
  ES5 entry; CLAUDE.md gotchas pointer.
