---
date: 2026-05-02
introduced-at: n/a-vendor-knowledge
detected-at: operator-deploy
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: n/a (CLI contract; nothing to fix)
time-to-detect: minutes (the missing source led to confusion mid-debug)
tags: [aws-cli, cloudfront, vendor-quirk]
---

# `aws cloudfront get-function` writes the source to a positional outfile

## Symptom

Running

```bash
aws --region us-east-1 cloudfront get-function \
  --name "$FN_NAME" --stage LIVE
```

returned only metadata on stdout:

```json
{ "ETag": "ETVPDKIKX0DER", "ContentType": "application/octet-stream" }
```

The actual function source — the whole point of the call —
appeared to be missing. Mid-debug, this nudged us toward
"the function doesn't have a source on LIVE, the deploy didn't
work" instead of the truth ("you forgot the outfile arg").

## Root-cause chain

1. **Why?** The function source is missing from the response.
   Because AWS CLI v2 special-cases blob-typed responses. For
   `get-function`, the response body (the function code) is a
   binary blob; the CLI writes the bytes to a file you specify as
   a trailing positional argument rather than printing them on
   stdout (where they'd corrupt JSON formatting).
2. **Why isn't the positional arg flagged in `--help` the same way
   options are?**
   It's documented in the per-command help under "outfile (string)"
   at the bottom — easy to miss. The AWS CLI's general convention
   is that blob outputs go to a positional outfile, but this is
   only mentioned in passing in top-level docs.
3. **Why does stdout still emit some JSON?**
   `ETag` and `ContentType` are first-class response properties
   that JSON-serialise fine. Only `FunctionCode` is the blob
   redirected to the outfile.

**Root cause:** we thought `get-function` printed the function
source on stdout (like most CLI commands print their primary
output). Actually AWS CLI v2 redirects binary response bodies to a
positional outfile and emits only JSON metadata to stdout.

## Detection failure causes

- **Operator-deploy:** the CLI's behaviour is unintuitive but
  documented; faster operator awareness would have skipped this.

## Countermeasure

- **Code:** none — CLI contract.
- **Operator pattern:** always pass an outfile explicitly when
  invoking `get-function`:
  ```bash
  aws --region us-east-1 cloudfront get-function \
    --name "$FN_NAME" --stage LIVE /tmp/cf-fn.js
  cat /tmp/cf-fn.js
  ```
  The outfile is overwritten on each call, so re-fetch after a
  redeploy if you want fresh bytes — `cat`-ing a stale file is a
  common confounder.

## Eradication

- **Sibling defects swept:** `aws lambda get-function` has the
  same blob-response shape; same pattern applies. Documented in the
  same shell pattern.
- **Tooling change:** none.
- **Detection improvement:** none.
- **Knowledge sharing:** this entry; the diagnostic snippet in
  `cloudfront-function-runtime-es5.md` and
  `cloudfront-function-throttle-persistence.md` always include the
  outfile as a complete invocation.
