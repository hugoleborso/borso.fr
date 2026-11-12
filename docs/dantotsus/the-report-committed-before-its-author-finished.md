---
date: 2026-11-12
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#298'
fix-pr: none (the kaizen pull request for PRs #293 and #298 that adds this file)
fix-commits: [self]
eradication-level: 5
eradication-paths: [.claude/agents/technical-validator.md, .claude/skills/technical-validation/SKILL.md]
time-to-detect: minutes
tags: [harness, hooks, validation, agents, process]
zone: .claude/skills/technical-validation/SKILL.md
recurs: none (the-validator-opened-a-checkout-holding-only-the-plan shares four tags and is about which checkout a validator opens; no earlier entry is about the main session working while a validator runs)
---

# The report committed before its author finished

## User impact

The record of PR #298's second review holds a draft. Read on `main`, under
`docs/features/pragma/cold-start-sweep/validation/`.

| | Seen | Expected |
| --- | --- | --- |
| Reports for round 2 | Two files. `technical-validation-2026-11-11-2330.md` has `C02_CELL` where the evidence of its blocking finding goes | One file, the one the validator handed back |
| What the fixes were written from | The draft, 13 minutes before the handback at 00:05 UTC | The handed-back report |
| The validator's re-run of the failing test | It ran the test the main session had fixed at 23:51 UTC, and had to be redone from a `git archive` export of the reviewed commit | It ran the commit under review |
| `docs/quality/feature-cost.md` | Counts review rounds by report file, so it reads 3 for 2 rounds | 2 |

## Causal chain

- A report with a placeholder cell is on `main`, and nothing may remove it.
  - Commit `8f70e7ef8` staged it at 23:52 UTC, and
    `check-dated-records-are-append-only.sh` refuses any later edit or
    deletion under `validation/`.
    - The main session read the file from the working tree and took it for the
      verdict. It held a `## Verdict: FAIL` line and both finding lists.
      - The validator had written a first version at `report_path` and was
        waiting for midnight to run one test again. It handed back at
        00:05 UTC.
      - The main session was free to read and commit during the review. It
        made four commits between 23:51 and 00:03 UTC.
        - The validator ran in the background, as the operator wants it to.
        - The validator's procedure said where to write, and not when:

```
9. **Write the report.** Markdown at `report_path`, format below.
```

## Root cause of occurrence

*Thought the report file is the validator's answer, so it can be read as soon
as it holds a verdict. Actually the answer is the handback, and the validator
used the file as its working copy until then.*

The Agent tool's description, as this session holds it: "Subagents run in the
background by default; you'll be notified when one completes." The handback is
that notification. The skill's step 8 said "Read the report's verdict", with no
word on when.

## Detection failure causes

- **The append-only gate:** it protects every file under `validation/` from
  the day it is committed. It cannot tell a draft from a verdict, so it locked
  the draft in.
- **Review:** the validator saw the branch move and said so in its report. It
  cannot stop the main session, and should not.
- **Earlier sweeps:** the branch moved under a review on PR #238 and PR #278.
  Both sweeps wrote `no-op`, because the commit was a `.gitignore` line or a
  document. On PR #278 an implementer's verdict was also committed holding
  `GATES_PLACEHOLDER`, and its row read "one occurrence".

## Countermeasure

The validator drafts in its scratchpad and copies the report to `report_path`
once, complete, as its last step. A file at that path is then always the
report. The skill tells the main session to read it after the handback.

A first version of this entry ran the validator in the foreground, with a hook
that refused a background dispatch. The operator refused it on 2026-11-12: the
main session must stay free while a review runs.

## Eradication

**Type:** knowledge (level 5). Two instructions, each at the step where the
mistake was made. No check can tell a draft from a report, and the stronger
mechanism, a blocked main session, is refused.

**Reference:** the commit that adds this file's final text to pull request #310.

```diff
-9. **Write the report.** Markdown at `report_path`, format below.
+9. **Write the report.** Markdown at `report_path`, format below. Draft it in your scratchpad and copy it to `report_path` once, complete, as your last step before you return. [...]
```

```diff
-8. **Read the report's verdict and its two finding lists**, not the tables.
+8. **Read the report's verdict and its two finding lists**, not the tables, once the agent has handed back. A file at `report_path` before that is a draft [...]
```

The validator's first step also says what to do when the branch moves under
it: keep reviewing the commit it recorded, from `git show` or a `git archive`
export, which is what the validator of PR #298 worked out by itself.

**Proof it can fail:** none. An instruction has no refusal to show.

**Similar instances:** the branch also moved under a review on PR #238 and
PR #278. On PR #107 the main session was asked to commit screenshots the
visual validator was still writing. `visual-validator.md` is not changed: its
evidence folder fills as it goes by design, and no draft of its report has
been committed.
