---
date: 2026-05-04
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: #6
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [<to-be-filled>]
eradication-level: 4
time-to-detect: hours
tags: [skills, harness, workflow]
---

# Feature-flow skills do not auto-trigger; the human becomes the loop

## Symptom

Across PR #6 the user had to nudge the agent to invoke each skill in the chain at the right moment:

| When | What didn't happen by itself |
| --- | --- |
| Spec finished, planning phase | Agent did not invoke `/technical-conception`. User said "now create the [plan]". |
| Plan finished, implementation | Agent did not invoke `/implementation`. User said "Using /implementation yes". |
| Implementation finished, validation | `/visual-validation` and `/technical-validation` were invoked manually each round. |
| PR merged | `/after-task-dantotsus` did not auto-trigger. User said "You should auto start the use of the tool /after-task-dantotsus. You did not." |

The chain `/specification → /technical-conception → /implementation → /visual-validation → /technical-validation → /after-task-dantotsus` is documented end-to-end in CLAUDE.md and in each skill's own SKILL.md, but each transition relies on the agent *remembering* the next step at the right moment. Across a long session, that memory fails.

## Root-cause chain

1. **Why** did the agent not chain to the next skill?
   Each skill's body lists the next skill as a follow-up at the end of `## What comes next` or in the procedure's last step, but the cross-reference is documentary, not operational. The agent reads the line, finishes the current skill, and exits; it doesn't auto-invoke the next.

2. **Why** is the cross-reference documentary?
   Claude Code's skill system invokes a skill when the user types a slash command or when the agent decides to invoke it. There is no "skill A's last step is to invoke skill B" wiring; the agent has to make that call.

3. **Why** doesn't the agent reliably make that call?
   At each transition the agent has just finished a long stretch of work. It exits the current skill into the main session, sees the user's last message (often "looks good"), and treats that as a natural stop. The follow-up skill is one slot of working memory away; absent a hard prompt, it doesn't fire.

4. **Why** is `/after-task-dantotsus` the most-skipped of all?
   Because the trigger is *external* — a PR merge happens on GitHub, often after the agent's session has effectively wound down. The agent isn't watching for the merge; the user is.

5. **Why** is this category recurring, not one-off?
   The skill chain is now six skills long. Each transition is a probability-of-skip; the cumulative probability of skipping at least one is high.

**Root cause:** *thought* documenting the skill chain in cross-references is enough; *actually* skills do not chain themselves and the agent's working memory is unreliable across long sessions, so transitions need a harness-level mechanism that doesn't depend on the agent remembering.

## Detection failure causes

- **Typing / linter / CI:** N/A — process artefact.
- **Self-validation:** the agent's "is the procedure complete?" check at the end of each skill has no opinion on what comes next.
- **Code review:** the user noticed; the user is the gate by default. Failure mode: every skill chain across every feature requires the user to be the trigger.

## Countermeasure

The user explicitly invoked each skill at each transition during PR #6. The agent caught up after each prompt.

- **Code:** none for the recovery itself.
- **Operator action:** the user typed "use /<next-skill>" at every transition, ~5 times during the PR.

## Eradication (mandatory — code-level)

**Type:** Detection (level 4 — Stop-hook reminder of the next skill in the chain)

**Reference:** PR (this kaizen) · commit `<kaizen-commit>`

**The actual fix:** add a Stop-hook (`.claude/hooks/stop-skill-chain-reminder.sh`) that fires every time the agent finishes its turn. The hook inspects the recent transcript for the last `Skill` tool invocation; if the previous skill was one of the feature-flow skills (`specification`, `technical-conception`, `implementation`, `visual-validation`, `technical-validation`), the hook prints a single-line reminder of the next skill in the chain and which condition must hold to invoke it. The hook output is surfaced to the agent on the next turn, so the chain progresses without the user having to type the next slash command.

For the merge-time transition (`/after-task-dantotsus`), a complementary GitHub webhook handler — already on the harness when `subscribe_pr_activity` is active — fires on `pull_request.closed` with `merged: true`. The hook turns that webhook event into a Stop-hook reminder: *"PR #N merged. Next: invoke /after-task-dantotsus."*

```bash
# .claude/hooks/stop-skill-chain-reminder.sh — invoked by the harness on Stop event
#
# Reads the most recent Skill invocations from the transcript (via the stop-hook
# context the harness provides), determines whether the agent just exited a
# feature-flow skill, and emits the next-skill prompt so the agent's next turn
# starts with the chain in mind.
```

Both reminders are non-blocking — they do not auto-invoke the next skill. The agent still has to call `Skill`. The reminders just close the working-memory gap that produces the skip in the first place.

**Sibling defects swept:** the entire feature-flow skill chain inherits the reminder. Other skill clusters (e.g. `/dantotsu` standalone) are unaffected.

## See also

- [`.claude/skills/after-task-dantotsus/SKILL.md`](../../.claude/skills/after-task-dantotsus/SKILL.md) — the skill that should auto-trigger on merge; this dantotsu eradicates the trigger gap.
- CLAUDE.md *Self-improvement loop* section — names the kaizen-PR-on-merge contract that this dantotsu makes operational.
