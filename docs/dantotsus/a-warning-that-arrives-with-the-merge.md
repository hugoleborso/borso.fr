---
date: 2026-11-05
introduced-at: code-review
detected-at: operator-deploy
severity: low
related-pr: '#274'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/merge-deploys-prod.core.ts, scripts/hooks/checks/merge-deploys-prod.core.test.ts]
time-to-detect: minutes
tags: [hooks, harness, deploy, ci, github-actions]
zone: scripts/hooks/checks/merge-deploys-prod.core.ts
recurs: [two-merges-sixteen-seconds-apart-one-untested-main, the-merge-whose-blast-radius-nobody-printed]
---

# A warning that arrives with the merge

## User impact

The operator said "merge it" on PR #274. The session merged. Only then did it
read the hook's notice that `main` had moved after CI started, which ended
with "Tell the operator before merging". The operator heard about the
untested combination after production deploys had started.

| | Seen | Expected |
| --- | --- | --- |
| Merge of #274 | Merged on a base two commits newer than its CI, then told | Told, or made to test the combination, before the merge ran |

Nothing broke. `main`'s own run on `6250f706a` passed its app tests
(measured, `gh api .../check-runs` on that commit).

## Causal chain

- The operator learned of an untested merge after it ran.
  - The session acted on the notice only after the merge call returned.
    - The notice travelled as `additionalContext`, which the session reads
      beside the tool's result.
      - `pretool-merge-deploys-prod.sh` printed "before merging" and then
        exited 0, so the instruction rode a channel that arrives after the call:

        ```bash
        # notice ends "...not a green light. Tell the operator before merging."
        jq -n --arg context "$CONTEXT" \
          '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $context}}'
        exit 0   # ❌ the merge runs; the notice is read with its result
        ```

        - Commit `f41c5f7da` (#258, the kaizen of PR #257) added the
          moved-base check and that sentence. Its message says *"The hook
          still never blocks."* The file's header, already in that agent's
          context, said *"it ALWAYS exits 0. It never blocks a merge"*. No
          file in the repository said when a PreToolUse `additionalContext`
          reaches the model (Material).
        - The same kaizen named the level 1 fix, branches required to be up
          to date or a merge queue, and left it as *"the operator's call"* in
          [`two-merges-sixteen-seconds-apart-one-untested-main`](./two-merges-sixteen-seconds-apart-one-untested-main.md).
          It wrote no file under `docs/operator-backlog/`, so the request
          never reached the operator and the hook stayed the only defence
          (Method).

## Root cause of occurrence

*The agent thought a PreToolUse notice is read before the call runs, actually
it is read with the call's result.* (Material)

The agent that wrote the line knew the hook never blocks: the header it kept
says so. What was absent from its context was when that notice arrives. No
knowledge entry, standard or skill said it (`grep -rln additionalContext
docs/knowledge docs/standards` finds nothing today). A sentence telling the
reader to act before the call cannot be followed from that channel.

## Detection failure causes

- **Hook design:** the moved-base check stopped at detection (level 4) and
  assumed its reader could still act.
- **Proof:** that sweep proved the check prints. It never fed a merge and
  checked whether the session read the notice before the merge returned.
- **Operator backlog:** the server-side rule that would have refused the stale
  merge for every merger was written only inside a dantotsu, which the
  operator does not read.

## Countermeasure

The hook now exits 2 when `main` moved after CI started *and* a commit since
then changes a file this branch changes. It names the reversible step: merge
`main` in, push, wait for the `check_suite` event. That step needs no
operator, so it is not the confirmation CLAUDE.md rules out. When no file
overlaps, the merge goes through, and the notice says it has already run and
points at `main`'s own CI run instead of asking for something already too late.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `572a62640` (#276, the kaizen of PR #274) made the shell
hook exit 2. Commit `458e886c4` (#411) deleted `.claude/hooks/pretool-merge-deploys-prod.sh`
and ported every hook to TypeScript. The refusal holds today in
`scripts/hooks/checks/merge-deploys-prod.core.ts`:

```ts
  return {
    kind: 'refuse',
    rule: 'merge-on-moved-base',
    summary: 'tried to merge a pull request beside base commits no CI run tested with it',
    lines: [
      `[merge-on-moved-base] refused: ${BASE_BRANCH} moved after this pull request's CI started (${ciStarted}),`,
```

**Proof it can fail:** `scripts/hooks/checks/merge-deploys-prod.core.test.ts`
asserts the refusal `[merge-on-moved-base] refused: main moved after this pull
request's CI started (2026-11-26T10:00:00Z),` on a base that changed a file the
branch changes. At the shell version, PR #257 fed with
`KAIZEN_LOG_REFUSALS=0` exited 2 with the same line (measured on 2026-11-05).

**The gap that holds:** the check refuses only when a file changed on both
sides. A type changed in one file and used in another file of the branch still
merges untested, with a notice read after the merge.

**Proposed:** add `docs/operator-backlog/require-branches-up-to-date.md`
asking the operator for the "require branches to be up to date before merging"
rule or a merge queue on `main`. GitHub would then refuse a stale merge for
every merger and every file, which makes the gap above impossible. The cost is
one more CI run for each parallel merge. Whether the rule is already set is
unknown, because this session can read no repository settings.

**Similar instances:** `grep -rn "before merging\|before you" scripts/hooks/checks/*.core.ts`
finds one other line, in `mockup-copy.core.ts`. It asks to fix copy *"before
you show the screen"*, an action after its own call, so it is not the same
defect. The moved-base notice now says the merge *"has already run by the time
you read this"*.
