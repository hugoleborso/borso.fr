# `aws cloudfront get-function` writes the source to a positional outfile

## Symptom

Running

```bash
aws --region us-east-1 cloudfront get-function \
  --name "$FN_NAME" --stage LIVE
```

returned only metadata (`{ "ETag": "ETVPDKIKX0DER", "ContentType":
"application/octet-stream" }`) on stdout. The actual function source
— the whole point of the call — was nowhere to be seen.

## Root-cause chain

1. **Why** is the function source missing from the response?
   AWS CLI v2 special-cases blob-typed responses. For
   `get-function`, the response body (the function code) is a binary
   blob; rather than emit it on stdout where it would corrupt JSON
   formatting, the CLI writes the bytes to a file you specify as a
   trailing positional argument.
2. **Why** isn't the positional argument flagged in `--help` the way
   options are?
   It's documented in the per-command help under the section
   "outfile (string)", but it's at the bottom and easy to miss.
   The AWS CLI's general convention is that blob outputs go to a
   positional outfile, but it's only mentioned in passing in the
   top-level docs.
3. **Why** does stdout still emit some JSON?
   The metadata fields (`ETag`, `ContentType`) are first-class
   response properties that JSON-serialise fine. Only `FunctionCode`
   is the blob redirected to the outfile.

**Root cause:** AWS CLI v2 redirects binary response bodies to a
positional outfile and emits only the JSON metadata to stdout.

## Fix

- **Code:** none — this is the CLI's contract.
- **Operator pattern:** always pass an outfile explicitly when
  invoking `get-function`:
  ```bash
  aws --region us-east-1 cloudfront get-function \
    --name "$FN_NAME" --stage LIVE /tmp/cf-fn.js
  cat /tmp/cf-fn.js
  ```
  The outfile is overwritten on each call, so re-fetch after a
  redeploy if you want the latest bytes — `cat` of a stale file is
  a common confounder.
