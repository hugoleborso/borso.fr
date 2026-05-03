# macOS BSD tooling + AWS CLI v2 input quirks

## Symptom

Several diagnostic one-liners I drafted during PR #2 failed when
operator-pasted on macOS:

- `date -u -d '30 min ago' …` → `date: illegal option -- d`.
- `aws cloudwatch get-metric-statistics --statistics Maximum,Sum,Average …`
  → `must be a value in the set [SampleCount, Average, Sum, Minimum, Maximum]`.
- `aws cloudfront test-function --event-object '<raw json>'`
  → `Invalid base64`.

## Root-cause chain

1. **Why** does `date -d` fail on macOS?
   macOS ships BSD `date`, not GNU `date`. BSD's relative-date flag
   is `-v` (e.g. `date -v-30M` for "30 minutes ago"); `-d` doesn't
   exist.
2. **Why** does `--statistics` reject a comma-joined value?
   The AWS CLI parses list-typed parameters as **space-separated**
   tokens: `--statistics Maximum Sum Average`. A comma-joined string
   is a single token, not three, and it doesn't match any of the
   allowed enum values.
3. **Why** does `--event-object '<raw json>'` get rejected as
   non-base64?
   In AWS CLI v2, fields typed as `BLOB` (binary) require base64
   input by default. The previous v1 default was raw bytes, which
   is why drafts that "worked locally for someone" lost in CI.
   The v2-friendly forms are:
   - `--event-object fileb://path/to/event.json` (read raw bytes
     from a file; CLI does the base64-encoding).
   - `--event-object "$(echo -n '<json>' | base64)"`.
4. **Why** do these all bite specifically during diagnostics?
   They live in throwaway one-liners, not in the codebase. There's
   no test or CI gate to catch them; the operator is the runtime.

**Root cause:** macOS' BSD `date` and AWS CLI v2's stricter input
expectations diverge from the GNU/Linux + AWS CLI v1 defaults that
many drafts assume.

## Fix

- **Code:** none — these are operator-shell concerns.
- **Conventions for any future diagnostic snippet in this repo:**
  - Use `date -u -v-<N>M …` for relative timestamps.
  - Use `--statistics Foo Bar` with **spaces**, not commas.
  - Use `--<foo>-object fileb://path` for binary inputs.
  - When showing CLI examples in docs, bias toward the macOS-safe
    form. Linux operators won't be hurt by `-v-30M` failing —
    they'll see the error and switch — but macOS operators get a
    silent `illegal option` blob that hides the real intent.
