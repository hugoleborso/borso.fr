---
date: 2026-05-21
introduced-at: conception
detected-at: review
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/24
fix-pr: https://github.com/hugoleborso/borso.fr/pull/<TBD>
fix-commits: []
eradication-level: 5
time-to-detect: minutes
tags: [harness, workflow, claude-md, deploy, kaizen, self-improvement-loop]
---

# Post-merge follow-ups were implicit, so they almost slipped

## Symptom

PR #24 merged, a `<github-webhook-activity>` event with
`Outcome: merged` arrived in the session. The agent's response
mentioned the deploy reminder _and_ the `/after-task-dantotsus`
follow-up — but only because the agent happened to remember
both. CLAUDE.md prescribes the deploy reminder explicitly, but
the _Self-improvement loop_ rule (open the kaizen PR after every
merge) lives in a different section and the agent's response
treated it as a soft suggestion rather than a load-bearing rule.

A turn later, the user asked:

> _« Mergé, good pour toi ? »_

And, two turns later:

> _« Redonne les 4 leçons ? »_

The follow-up only landed because the user re-asked. With a
less-engaged operator, the loop would have been skipped — exactly
the failure mode the _Self-improvement loop_ rule exists to
prevent.

The matching gap is the _library-search_ habit codified in
[`/after-task-dantotsus`](../../.claude/skills/after-task-dantotsus/SKILL.md)
step 2c (added in commit `a0b7f27`): the rule exists, but the
kaizen skill itself only fires when the operator invokes it.
The "next layer" of automation — _the harness proposes the right
skill on a merge webhook_ — is the underlying gap.

## Root-cause chain

1. **Why is the deploy reminder mandated by CLAUDE.md but the
   kaizen reminder isn't?**
   CLAUDE.md _Deployments_ says _"After a PR merges, Claude's
   deploy-related action is to remind the user to approve the
   pending deploy in GitHub Actions"_. The _Self-improvement
   loop_ section says _"open a follow-up PR labelled `kaizen`"_ —
   which is one section away and reads as a description of the
   loop, not as an action item paired with the deploy reminder.
2. **Why doesn't the harness auto-propose `/after-task-dantotsus`
   on a `merged` webhook event?**
   The webhook-handling rule in the system prompt covers PR
   activity events (comments, CI, reviews) but treats
   `Outcome: merged` as a terminal state — _"do not reopen this
   PR or open a new PR for the same change"_ — without
   prescribing the kaizen follow-up. The terminal-state phrasing
   is correct (don't re-touch the merged PR) but the gap is the
   _new_ PR (`claude/lessons-from-pr-<n>`) that the rule should
   propose.
3. **Why does the kaizen miss matter when the deploy reminder
   didn't?**
   Both rules exist; one fires, the other relies on memory. The
   asymmetry is the defect — when only one of two paired
   follow-ups is enforced, the unenforced one decays.

**Root cause:** _thought_ the _Self-improvement loop_ rule
self-applies on merge, _actually_ it depends on the agent
remembering to propose `/after-task-dantotsus` at exactly the
moment the merge webhook arrives. CLAUDE.md doesn't pair the
two follow-ups in one rule, and the system prompt's
webhook-handling section doesn't list the kaizen proposal as a
mandatory action on merge.

## Detection failure causes

- **CLAUDE.md _Deployments_ section** — covers the deploy
  reminder explicitly, ends there.
- **CLAUDE.md _Self-improvement loop_ section** — names the
  follow-up PR but doesn't pin it to the merge moment.
- **System-prompt webhook handling** — handles `merged` as a
  terminal state for the current PR, not as a trigger for the
  next PR.
- **Operator review** — caught it implicitly by re-asking; on a
  less-engaged session this would have been a silent skip.

## Countermeasure

The user invoked `/after-task-dantotsus` directly, which produced
this PR.

## Eradication (mandatory — code-level)

**Type:** knowledge addition (level 5) — pair the two follow-ups
in a single CLAUDE.md rule and surface it in the system-prompt's
webhook-handling section as a mandatory action on
`Outcome: merged`. Level 2 alternative (a hook that fires when
the webhook event arrives) was rejected: webhook events are
delivered as messages to the agent, not as harness events with
hookable surface; the agent itself is the only place the rule
can fire.

**Reference:** [PR #<TBD>](https://github.com/hugoleborso/borso.fr/pulls?q=is%3Apr+head%3Aclaude%2Flessons-from-pr-24) ·
this kaizen PR.

**The actual fix:**

```diff
 ## Deployments

 - **Preview deploys are automatic.** A preview stack is created/updated on every PR push, and torn down on PR close, by the GitHub Actions workflow.
-- **Prod deploys run from CI on push to `main`, gated by manual approval of the `prod` GitHub environment.** The workflow `.github/workflows/deploy.yml` does the work; Claude never runs `pnpm --filter ... run deploy` locally. **After a PR merges, Claude's deploy-related action is to remind the user to go approve the pending deploy in GitHub Actions** — once approved, the deploy is automatic. The reminder is not optional: a merged PR touching infra or app code sits in the approval queue until Hugo clicks Approve.
+- **Prod deploys run from CI on push to `main`, gated by manual approval of the `prod` GitHub environment.** The workflow `.github/workflows/deploy.yml` does the work; Claude never runs `pnpm --filter ... run deploy` locally.
+- **On every merge webhook, Claude surfaces TWO paired follow-ups in the same response — not one, not optional:**
+  1. *Approve the pending prod deploy* in GitHub Actions (the deploy sits in the queue until approved; this is the reminder described above).
+  2. *Propose `/after-task-dantotsus`* to capture lessons in a kaizen PR (per *Self-improvement loop* below).
+  The asymmetry where one fires but the other relies on memory is the failure mode this rule exists to prevent. If either step is genuinely a no-op (no infra/app changes for the deploy step ; a trivial PR for the kaizen step), say so explicitly in the same response — silence is not equivalent to "no action needed".
 - **Migration cutovers (alias takeovers, bucket renames, CDK construct rewrites) are higher-risk prod deploys.** They additionally require the operator to walk the migration runbook for the affected resource. CloudFront alias takeovers are gated by `scripts/preflight-cloudfront-aliases.sh`; see [`docs/knowledge/cloudfront-cname-uniqueness.md`](./docs/knowledge/cloudfront-cname-uniqueness.md).
```

**Sibling defects swept:** the library-search-at-the-right-moment
gap (`built-my-own-before-checking-the-library.md`) is the same
_"the rule exists, the trigger doesn't"_ shape. That dantotsu's
fix landed the rule in three skills (planning, implementation,
kaizen); this entry adds the missing _merge-event_ trigger that
ensures the kaizen skill actually fires.

## See also

- [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md) — same shape (rule exists, trigger missing) at a different stage.
- [`pushed-without-reading-pr-review-comments.md`](./pushed-without-reading-pr-review-comments.md) — sibling on the same PR-flow timeline.
