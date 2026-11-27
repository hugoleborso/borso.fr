---
date: 2026-05-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#14'
fix-commits: [6b16fa535f]
eradication-level: 5
eradication-paths: [.claude/skills/tech-lead-orchestrator/standard.md]
time-to-detect: minutes (user asked)
tags: [orchestrator, skill, pr-description, github]
zone: .claude/skills/tech-lead-orchestrator
---

# The orchestrator finished a redesign under a pull request still titled "seed"

## User impact

A reviewer reads a pull request's title and body before anything else. On
PR #14 both described a different change from the one about to merge.

| | Seen | Expected |
| --- | --- | --- |
| PR #14 title | `feat(meta): seed meta slug + .claude/skills/* workspace pattern` | A title naming the galaxy WebGL landing redesign of `apps/borso-fr` |
| PR #14 body | The seed commit | The redesign, two ADRs (one superseding the other), a dantotsu, a merge with `main` and two late fixes |

Twenty-three commits separated the two (counted by the first version of this
entry). The orchestrator stopped at its `ship` stage with no objection. The
operator had to ask: *"N'oublie pas aussi de changer la description de la
PR."* The fix was one `update_pull_request` call.

## Causal chain

- PR #14's title and body described the seed commit after the branch had
  become a redesign.
  - The orchestrator ended its run at `ship` without touching the pull
    request. Its transition table, written in commit `b8d5862ef`, defined the
    stage as:

    ```text
    | ship | (end) | Push successful, deploy reminder issued. |   ← ❌ the pull request is not part of what ships
    ```

    - The title and body were written once, when the pull request was opened
      on branch `claude/tech-lead-orchestrator-skill-dVKSm` before the
      orchestrator ran. The branch then grew twenty-three commits under them.
      - The standard's author assumed a pull request opens after a run, by a
        separate step. In this harness the web UI opens it on the branch
        before the work starts (Material).

## Root cause of occurrence

*Thought a pull request is opened after the run, so its description is another
step's job, actually the harness opens it before the work, so only the run
knows what landed by the time it ends.* (Material)

The orchestrator is an agent, and how this harness opens pull requests was
absent from the standard it wrote. The fix commit `6b16fa535f` records the
opposite in the same standard: "they go stale instantly when the work scope
evolves mid-branch". PR #14 was the first end-to-end run on a real feature, so
it was the first where the scope moved that far.

## Detection failure causes

- **Typing, linter, CI:** a pull request's body is text on GitHub. CI ran
  `scripts/pr/check-pr-body.ts` only on the template, never on the live body.
- **Validators:** the technical and visual validators read the diff, not the
  pull request body, so the stale body passed every gate unread.
- **Review:** the operator caught it on sight in the pull request list, which
  is the moment the orchestrator was meant to spare him.

## Countermeasure

Commit `6b16fa535f` changed the `ship` row to "Push successful, deploy
reminder issued, **PR description updated to reflect what the run actually
shipped**", and added a *PR description maintenance (stage `ship`)* section.
It looks up the open pull request by `head.ref` and rewrites the title and
the body. PR #14's title and body were then rewritten by hand.

## Eradication

**Type:** knowledge (level 5). The step is a checklist in an agent standard.

**Reference:** commit `6b16fa535f`. `.claude/skills/tech-lead-orchestrator/standard.md`
holds it today, line 47:

```text
| ship | (end) | Push successful, **PR description updated to reflect what the run actually shipped** (see *PR description maintenance* below). |
```

The first version of this entry called this level 2. A checklist an agent
reads is level 5. It does not cover a body that goes stale after the run,
such as a fix round pushed later.

**Proposed:** run `scripts/pr/check-pr-body.ts --pr <n>` in `ci.yml` on every
`pull_request` `synchronize`, against the live title and body. The script
already reads a posted body through `gh api`. Add to it a refusal when the
title's conventional-commit scope is not among the scopes of the changed
paths. `.github/path-filters.yml` maps each app to its paths. The scopes with
no app, such as `meta`, `docs`, `ci` and `infra`, need their own path rule. A
title left from an earlier scope would then turn the check red at the next
push, instead of waiting for the operator to notice.

**Proof it can fail:** not tried. The proposal is not built.

**Similar instances:** `grep -rn 'check-pr-body' .github/workflows .husky scripts/hooks/checks`
shows the checker runs on the template in `ci.yml` and `.husky/pre-commit`,
and on a draft through `scripts/hooks/checks/gh-pr-create.core.ts`. None reads
the body after a push.
