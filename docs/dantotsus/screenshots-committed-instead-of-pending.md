---
date: 2026-11-26
introduced-at: self-validation
detected-at: review
severity: low
related-pr: '#406'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/screens-shown.core.ts, .gitignore, .claude/skills/visual-validation/SKILL.md, .claude/agents/visual-validator.md]
time-to-detect: minutes
tags: [harness, hooks, agents, visual-validation, screenshots]
zone: .claude/skills/visual-validation/SKILL.md
recurs: [a-screen-pushed-without-its-picture]
---

# Screenshots committed instead of pending

## User impact

On PR #406 the operator opened the pull request and found no Screenshots
comment. He wrote "Screenshots !!! tu les oublies toujors" at 09:08 UTC (read
from the shipping session's transcript). The comment appeared at 09:11, after
the session uploaded the folder `2026-11-26T0910`.

| | Seen | Expected |
| --- | --- | --- |
| After the pull request opened at 09:01 | No Screenshots comment | Twelve screens of the gear page |
| In git | 12 PNGs, 468 KB, under `validation/screens-visual-r1/` (measured, `du -sh`) | None: the verdict was PASS_EXCEPT_UNVERIFIABLE, with no FAIL row |

## Causal chain

- The operator had to ask for the screenshots.
  - `/open-pr` step 5b uploads what waits in `validation/.pending-upload/`,
    and nothing waited there (inferred from the committed PNGs).
    - The validator saved its evidence in a committed folder, and the move to
      `.pending-upload/` that `/visual-validation` step 8 asked for by hand did
      not happen.
      - `/visual-validation` step 4 created the evidence folder outside the
        gitignored path, and the validator's definition told it to keep it
        there: "The folder is committed alongside the report"
        (`visual-validator.md`, the `evidence_dir` input).
        - 05de4df4e (2026-05-03) wrote that sentence, when every screenshot
          was committed.
          - 154e4cd9a (2026-09-21) moved passing screenshots out of git with
            ADR-2026-09-21T0819. It changed the agent's `description:` to
            "screenshot evidence the skill then publishes or commits depending
            on the verdict", and left the `evidence_dir` sentence two screens
            below unchanged.

## Root cause of occurrence

*Thought a manual split after validation keeps passing screenshots out of git,
actually the default path was the committed one, so a skipped step committed
them and left nothing to publish.* (Material)

The validator was an agent. Its definition, the document in its context, said
to commit the folder, and it did. One why further is Method. The ADR changed a
rule, and the commit that enacted it edited the files it thought of, while the
sentence that applied the old rule went on applying it for two months. Nothing
ties an ADR to the lines that enact the rule it replaces.

## Detection failure causes

- **Hooks:** the Stop hook checked a push for an upload, but treated any mention
  of `visual-validation` in the turn as one, and the open-pr turn named the
  report.
- **Gates:** nothing read `.pending-upload/` before a pull request opened.
- **Review of the ADR's commit:** its diff showed the edited `description:` and
  not the unedited `evidence_dir` line.

## Countermeasure

The evidence folder is now `<validation_dir>/.pending-upload/<timestamp>/`,
gitignored. Step 8 moves out only the files a FAIL row cites, and step 9,
which staged evidence for commit, is gone. The stale sentence in
`visual-validator.md` is replaced: `evidence_dir` is now "the folder for your
screenshots, `<validation_dir>/.pending-upload/<timestamp>/`". A skipped step
now leaves the screenshots waiting to be published instead of committed.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file (PR #407). The Stop hook it added in
Python was ported to TypeScript by 458e886c4 (PR #411), which deleted every
`.claude/hooks/` script. The check lives today in
`scripts/hooks/checks/screens-shown.core.ts`.

It blocks, once, a turn that opened a pull request, or pushed on a session that
has one, while a file waits under
`docs/features/*/*/validation/.pending-upload/*/`. `/open-pr` deletes the
folder once the upload reads back, so a file left there is one not published.

```ts
function hasLeftScreenshotsUnpublished(inputs: string, sessionInputs: string, root: string, world: HookWorld): boolean {
  const isPullRequestNumbered = PULL_REQUEST_OPENED.test(sessionInputs);
  if (!PULL_REQUEST_OPENED.test(inputs) && !(PUSH.test(inputs) && isPullRequestNumbered))
    return false;
  const features = `${root}/${FEATURES}`;
  const found = world.run('find', ['-L', features, '-mindepth', '6', '-maxdepth', '6']).stdout;
  return found.split('\n').some((path) => PENDING_SCREENSHOT.test(path.slice(features.length + 1)));
}
```

The default path is gitignored, so a skipped step can no longer commit passing
screenshots, and the hook refuses the leftover. Nothing better exists for this
instance.

The deeper cause stays open as a class: an ADR that changes a rule does not
reach the files that enact the old one.

**Proposed:** have the ADR template carry the sentence it retires, and a
pre-commit check fail while that sentence still appears under `.claude/` or
`docs/standards/`. 154e4cd9a would then have been refused while
`visual-validator.md` still said "committed alongside the report". It does not
exist yet.

**Proof it can fail:** proved on a scratch tree when the Python hook shipped: a
turn calling `create_pull_request` passed with an empty pending folder and was
blocked once a PNG was in it. The TypeScript port is gated at 100% coverage by
`screens-shown.core.test.ts`.

**Similar instances:** `grep -rn "committed alongside" .claude/` finds no other
stale copy today. The 12 PNGs PR #406 committed stay in git: deleting them is a
separate decision for the operator.
