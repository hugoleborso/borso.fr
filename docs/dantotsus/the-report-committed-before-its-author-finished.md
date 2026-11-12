---
date: 2026-11-12
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#298'
fix-pr: none (the kaizen pull request for PRs #293 and #298 that adds this file)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-validator-runs-in-the-foreground.sh, .claude/settings.json]
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
        - The validator ran in the background. The skill's dispatch did not
          say otherwise, and the Agent tool's default is the background:

```
Agent({
  subagent_type: "technical-validator",
  description: "Technical validation against spec + plan",
  prompt: <self-contained brief — see template.md>,
})
```

## Root cause of occurrence

*Thought the report file is the validator's answer, so it can be read as soon
as it holds a verdict. Actually the answer is the handback, the file is a
working copy until then, and a dispatched agent runs beside the main session
unless the call says otherwise.*

The Agent tool's description, as this session holds it: "Subagents run in the
background by default; you'll be notified when one completes. Pass
`run_in_background: false` only when your very next action depends on this
agent's result and nothing else could usefully happen while it runs".
A review is that case. Its round 2 reads "only the commits after round 1's
`Reviewed:` SHA", so a commit made during round 2 is read by no round.

## Detection failure causes

- **The append-only gate:** it protects every file under `validation/` from
  the day it is committed. It cannot tell a draft from a verdict, so it locked
  the draft in.
- **Review:** the validator saw the branch move and said so in its report. It
  has no way to stop the main session.
- **Earlier sweeps:** the branch moved under a review on PR #238 and PR #278.
  Both sweeps wrote `no-op`, because the commit was a `.gitignore` line or a
  document. On PR #278 an implementer's verdict was also committed holding
  `GATES_PLACEHOLDER`, and its row read "one occurrence".

## Countermeasure

`/technical-validation` and `/visual-validation` dispatch their agent with
`run_in_background: false`. The main session then waits for the handback. It
cannot commit under the review, and the file it reads is the one returned.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit that adds this file.

```diff
+AGENT="$(jq -r '.tool_input.subagent_type // ""' <<<"$INPUT")"
+case "$AGENT" in
+  technical-validator | visual-validator) ;;
+  *) exit 0 ;;
+esac
+
+BACKGROUND="$(jq -r '.tool_input.run_in_background | if . == null then "unset" else tostring end' <<<"$INPUT")"
+[[ "$BACKGROUND" == "false" ]] && exit 0
```

The hook is registered on the Agent tool in `.claude/settings.json`. The
visual validator is included because it drives the dev server of the working
tree, and on PR #107 the main session was asked to commit screenshots it was
still writing.

**Proof it can fail:** the hook was fed each dispatch.

| `subagent_type` | `run_in_background` | Exit |
| --- | --- | --- |
| `technical-validator` | unset | 2 |
| `technical-validator` | `true` | 2 |
| `technical-validator` | `false` | 0 |
| `visual-validator` | unset | 2 |
| `visual-validator` | `false` | 0 |
| `Explore` | unset | 0 |
| none | unset | 0 |

The refusal reads: "this dispatch runs the technical-validator in the
background (run_in_background: unset). [...] Send the same call with
run_in_background: false, and commit nothing until it hands back."

The field names are the ones this session's Agent tool declares. The hook did
not fire live here, because a session reads its hooks when it starts.

**Similar instances:** `grep -rn "subagent_type" .claude/skills .claude/commands`
finds the two validation skills and their two brief templates, all four
changed here. `/feature-pipeline` spawns its validators from a workflow
script with `agent(brief, { agentType: 'technical-validator' })`, which is not
the Agent tool, so this hook does not see it. Whether the main session works
beside a workflow was not tested.
