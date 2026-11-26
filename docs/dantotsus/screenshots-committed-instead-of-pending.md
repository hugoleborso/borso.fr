---
date: 2026-11-26
introduced-at: self-validation
detected-at: review
severity: low
related-pr: '#406'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/stop-screens-shown-not-described.py, .claude/skills/visual-validation/SKILL.md, .claude/agents/visual-validator.md]
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
        gitignored path, and `visual-validator.md` said "The folder is
        committed alongside the report", against
        ADR-2026-09-21T0819.

## Root cause of occurrence

*Thought a manual split after validation keeps passing screenshots out of git,
actually the default path was the committed one, so a skipped step committed
them and left nothing to publish.*

## Detection failure causes

- **Hooks:** `stop-screens-shown-not-described.py` checks a push for an upload,
  but treats any mention of `visual-validation` in the turn as one, and the
  open-pr turn named the report.
- **Gates:** nothing reads `.pending-upload/` before a pull request opens.

## Countermeasure

The evidence folder is now `<validation_dir>/.pending-upload/<timestamp>/`,
gitignored. Step 8 moves out only the files a FAIL row cites, and step 9,
which staged evidence for commit, is gone. A skipped step now leaves the
screenshots waiting to be published instead of committed.

## Eradication

**Type:** DevX check (level 2)

The Stop hook blocks, once, a turn that ran `git push` or
`create_pull_request` while a file waits under
`docs/features/*/*/validation/.pending-upload/*/`. `/open-pr` deletes the
folder once the upload reads back, so a file left there is one not published.

```python
def left_screenshots_unpublished(turn, root):
    inputs = json.dumps([row.get("message", {}).get("content") for row in turn if row.get("type") == "assistant"])
    return bool(re.search(r"\bgit\s+push\b|create_pull_request", inputs)) and bool(glob.glob(PENDING_SCREENSHOTS, root_dir=root))
```

Proved on a scratch tree: a turn calling `create_pull_request` passed with an
empty pending folder and was blocked once a PNG was in it.

The 12 PNGs PR #406 committed stay in git: deleting them is a separate
decision for the operator.
