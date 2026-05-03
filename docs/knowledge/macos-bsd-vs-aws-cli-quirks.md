---
date: 2026-05-02
introduced-at: implementation
detected-at: operator-deploy
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: n/a (operator-script convention; not a code defect)
time-to-detect: seconds-to-minutes per snippet
tags: [aws-cli, macos, shell, operator-quirk]
---

# Diagnostic snippets that worked locally for the agent broke on macOS

## Symptom

Several throwaway one-liners I drafted during PR #2 failed when
Hugo pasted them into his macOS shell:

- `date -u -d '30 min ago' …` → `date: illegal option -- d`.
- `aws cloudwatch get-metric-statistics --statistics Maximum,Sum,Average …`
  → `must be a value in the set [SampleCount, Average, Sum, Minimum, Maximum]`.
- `aws cloudfront test-function --event-object '<raw json>'`
  → `Invalid base64`.

User impact: each one cost a couple of minutes of "is the AWS API
broken?" before someone noticed the actual cause was the snippet.

## Root-cause chain

1. **Why?** `date -d` fails on macOS.
   Because macOS ships BSD `date`, not GNU `date`. BSD's
   relative-date flag is `-v` (e.g. `date -v-30M`); `-d` doesn't
   exist.
2. **Why does `--statistics` reject a comma-joined value?**
   The AWS CLI parses list-typed parameters as **space-separated**
   tokens: `--statistics Maximum Sum Average`. A comma-joined
   string is a single token, not three, and matches no enum value.
3. **Why does `--event-object '<raw json>'` get rejected as
   non-base64?**
   AWS CLI v2 fields typed as `BLOB` require base64 input by
   default. (The previous v1 default was raw bytes, which is why
   drafts written for v1 lose under v2.) The v2-friendly forms are
   `--event-object fileb://path/to/event.json` or
   `--event-object "$(echo -n '<json>' | base64)"`.
4. **Why do these all bite specifically during diagnostics?**
   They live in throwaway one-liners, not in the codebase. There's
   no test or CI gate to catch them; the operator IS the runtime,
   and the operator was on macOS — not the agent's
   Linux-flavoured sandbox.

**Root cause:** the agent (running on Linux) drafted snippets
assuming GNU `date`, AWS CLI v1 input semantics, and comma-joined
list parameters. Operator-pasted on macOS / AWS CLI v2 / strict
list parsing, those defaults don't hold.

## Detection failure causes

- **Functional validation locally:** the agent doesn't have macOS
  available; running them in the Linux sandbox would have hidden
  only the BSD-`date` issue (the AWS CLI v2 + list-parsing issues
  affect Linux equally and were just operator-uncommon).
- **Operator-deploy:** detection happened the moment Hugo pasted
  each snippet — fast, but inconvenient.

## Countermeasure

- **Code:** none — these are operator-shell concerns.
- **Conventions for any future diagnostic snippet in this repo
  (and any docs/knowledge entry):**
  - Use `date -u -v-<N>M …` for relative timestamps (BSD form;
    GNU `date` ignores `-v` only as an unknown option, but most
    users will switch).
  - Use `--statistics Foo Bar` with **spaces**, not commas.
  - Use `--<foo>-object fileb://path` for binary inputs.
  - Bias toward macOS-safe forms in docs. Linux operators see the
    error and switch easily; macOS operators get a silent
    `illegal option` blob that hides intent.

## Eradication

- **Sibling defects swept:** rewrote every diagnostic snippet in
  `docs/knowledge/` to use the macOS-safe forms.
- **Tooling change:** none — these are documentation conventions.
- **Detection improvement:** none.
- **Knowledge sharing:** this entry; the conventions go into the
  Dantotsu skill itself so future agent-drafted diagnostics start
  on the right foot.
