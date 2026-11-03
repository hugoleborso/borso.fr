---
date: <YYYY-MM-DD>                  # when the Dantotsu was written
introduced-at: <stage>              # conception | implementation | self-validation | code-review
detected-at: <layer>                # typing | linter | local | ci | review | qa | staging | production | operator-deploy
severity: <level>                   # low | medium | high
related-pr: '#<n>'                  # the PR where the defect first lived, or none (<reason>)
fix-pr: '#<n>'                      # the PR that landed the eradication, or none (<reason>)
fix-commits: [<sha>, …]             # commits on main that moved the eradication; [self] = the commit adding this file; or none (<reason>)
eradication-level: <1-5>            # 1=structural impossibility | 2=devx check | 3=vendor patch | 4=detection | 5=knowledge
eradication-paths: [<path>, …]      # the files the eradication lives in; levels 1-4 need one that is not markdown
time-to-detect: <minutes/hours/days>
tags: [<topic>, …]                  # reuse existing tags: cdk, cloudfront, s3, ci, pnpm, dsql, github-actions, …
zone: <path>                        # where the defect LIVED (not where the fix landed); must exist in the tree
weak-point: <id>                    # optional; an id from docs/quality/weak-points.md
recurs: [<earlier-slug>, …]         # the entry this repeats, or none (<why it is a different class>)
---

# <The problem, not its solution, phrased to spark curiosity>

## User impact

What the user saw against what they should have seen, with exact numbers
and who measured them.

| | Seen | Expected |
| --- | --- | --- |
| <moment> | <what the user saw> | <what they should have seen> |

## Causal chain

- <What the user saw>
  - <The event that caused it>
    - <The event that caused that, down to the faulty line>

## Root cause of occurrence

*Thought <the belief>, actually <the fact>.*

<The source you read, linked, with the quoted passage.>

## Detection failure causes

- **<Layer>:** <the specific reason it missed the defect>

## Countermeasure

<The minimal change, and how it was verified. In analysis mode, the options
side by side with what the user sees and what each costs.>

## Eradication

**Type:** <structural impossibility · DevX check · vendor patch · detection · knowledge> (level <N>)

**Reference:** [PR #<n>](url) · commit [`<sha>`](url)

```diff
- <removed>
+ <added>
```

**Proof it can fail:** <the check's refusal on a planted defect>

**Similar instances:** <the search command and what it found>
