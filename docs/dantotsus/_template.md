---
date: <YYYY-MM-DD>                  # when the Dantotsu was written
introduced-at: <stage>              # conception | implementation | self-validation | code-review
detected-at: <layer>                # typing | linter | local | ci | review | qa | staging | production | operator-deploy
severity: <level>                   # low | medium | high
related-pr: <#n or url>             # the PR where the defect first lived
fix-pr: <#n or url>                 # the PR that landed the eradication (often the kaizen PR for this dantotsu)
fix-commits: [<sha>, …]             # the commits on fix-pr that actually moved the eradication
eradication-level: <1-5>             # 1=structural impossibility | 2=devx check | 3=vendor patch | 4=detection | 5=knowledge
time-to-detect: <minutes/hours/days>
tags: [<topic>, …]                  # cdk, cloudfront, s3, ci, pnpm, dsql, github-actions, …
---

# <Title — sparks curiosity, hints at the lesson, NOT the user-story name>

## Symptom

User-perspective. Verbatim error or screenshot if useful.

## Root-cause chain

1. **Why?** <step-1 question>
   <answer>
2. **Why?** <step-2 question>
   <answer>
…

**Root cause:** one sentence in `thought X, actually Y` form.
Validate with: *if the developer had known the "actually" part,
would they have written correct code on the first try?*

## Detection failure causes

For each defence-in-depth layer that should have caught the defect
but didn't, name the specific reason. Drop layers that are
inapplicable. Avoid "no test"-as-terminal — push to *why* there was
no test or why the test didn't cover the path.

- **Typing:** <…>
- **Linter / static analysis:** <…>
- **Functional validation locally:** <…>
- **CI (tests / build):** <…>
- **Code review:** <…>
- **PO / QA validation:** <…>
- **Staging monitoring:** <…>
- **Production monitoring / alerting:** <…>

## Countermeasure

Minimal change that restored correctness AND demonstrates the
developer understood the cause.

- **Code:** commit `<sha>` — <what changed and why it addresses the
  root cause>
- **Operator action:** <if anything is required outside the codebase>

## Eradication (mandatory — code-level)

Level reached on the eradication ladder (top is best):

1. **Structural impossibility** — types / API shapes prevent the
   misconception from being expressed.
2. **DevX check** — linter / type guard / pre-commit / actionlint /
   custom rule rejects the misconception at lint or commit time.
3. **Vendor patch** — `patches/<lib>/<short>.patch` applied via
   `pnpm patch`, plus `patches/<lib>/<short>.md` with the
   upstream-PR body the human will paste. Agent does NOT open
   PRs against repos outside `hugoleborso/*`.
4. **Detection** — alarm, synth-time test, integration test that
   exercises the previously-untested path.
5. **Knowledge** — only as floor when 1–4 are genuinely
   impossible. Pure-knowledge subjects belong under
   `docs/knowledge/`, not here.

Fill exactly these three blocks per shipped eradication. Keep them
explicit so a reviewer can audit: *what type of fix, where it
lives, what changed*.

**Type:** <one of: code diff · DevX check · vendor patch · detection · knowledge addition> (level <N> — <name>)

**Reference:** [PR #<n>](url) · commits [`<sha>`](url)[, [`<sha>`](url) ...]

**The actual fix:**

```diff
- <removed>
+ <added>
```

For a `knowledge addition` type, replace the diff with a link to
the `docs/knowledge/<slug>.md` entry and a brief summary of what
it captures.

**Sibling defects swept:** <paths / commits where similar latent
issues existed and were also addressed>

## See also

- <cross-link to related dantotsus or knowledge entries>
