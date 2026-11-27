---
date: 2026-10-06
introduced-at: conception
detected-at: local
severity: low
related-pr: '#108'
fix-commits: [a515b155cd]
eradication-level: 5
eradication-paths: [.claude/skills/after-task-kaizen/SKILL.md]
time-to-detect: weeks
tags: [self-improvement-loop, hooks, harness, skill]
zone: .claude/skills/after-task-kaizen
---

# The no-op that named its fix

## User impact

While stopping a dev server on PR #136, the `no-broad-kill` hook refused
`pkill` and suggested:

```
[no-broad-kill] If the PID is lost, find the one holding YOUR port rather than every match:
[no-broad-kill]   ss -lptn 'sport = :5173'
```

| | Seen | Expected |
| --- | --- | --- |
| Running the hook's advice | `ss: command not found`, the PID then found by hand with `ps` | a command that prints the PID holding the port |

## Causal chain

- The hook's advice failed with `ss: command not found`.
  - The hook told the agent to run `ss`, which the hosted container lacks:

    ```bash
    echo "[no-broad-kill]   ss -lptn 'sport = :5173'" >&2
    ```

    - Commit `cac22f1e9` (2026-08-08) wrote that line on a machine that had
      `ss`.
      - PR #108's sweep logged the failure as row 20 of its inventory, with
        `fuser` as a command that works, and closed it as `no-op: worth a line
        in the hook's message rather than an entry …`. The line was never
        written.
        - The sweep skill then defined a no-op as "already eradicated or too
          small" and required a reason without saying what a reason may
          contain.

## Root cause of occurrence

*The PR #108 sweep thought a no-op fits a finding too small for an entry,
actually a no-op closes the row, so the change its reason named had nobody left
to make it.*

**M: Method.** The sweep followed its skill. The skill offered "too small" as a
no-op and put no limit on the reason, so a row could both name a fix and close
itself.

## Detection failure causes

- **Gates:** `scripts/check-instructions-name-installed-tools.sh` checks the
  `pnpm exec`, `npx` and `node_modules/.bin` commands a skill or CLAUDE.md
  tells an agent to run. A hook's refusal message is not one of the files it
  reads, and `ss` is a system binary it does not resolve.
- **Review of the PR #108 kaizen:** the reviewer read the row as settled,
  because "no-op" is the word for settled.

## Countermeasure

Commit `a515b15` made the hook suggest `lsof -ti tcp:<port>`, checked here to
return the listening PID. Commit `b48ce3675` (PR #370) later removed the port
lookup altogether. The hook now points at `scripts/dev-server.sh stop <app>`,
which owns its process group, so no lookup advice is left to go stale.

## Eradication

**Type:** knowledge (level 5). A written rule in the skill the sweep reads.

**Reference:** [PR #141](https://github.com/hugoleborso/borso.fr/pull/141) ·
commit `a515b15`. `.claude/skills/after-task-kaizen/SKILL.md` lists the
decisions today:

```
- `fixed: <commit>`, a small change with no entry, shipped in the kaizen PR.
- `no-op: <reason>`, already eradicated upstream or genuinely too small. A
  reason that names a change is not a no-op. "Worth a line in the hook's
  message" is a fix, so make it here and record `fixed: <commit>`.
```

**Proof it can fail:** none. A skill rule refuses nothing. The reason given
when this shipped was that no grep can decide whether a free sentence proposes
a change. That reason holds only while the reason field is free text.

**Proposed:** subtract the free text. Drop "genuinely too small" and make the
only no-op `no-op: already eradicated by <path or commit>`. A gate can then
check that the cited path exists or the commit is on `main`, the way
`scripts/pr/pr-body.core.ts` parses a Markdown body. A row that names a change
still to make could not be closed as a no-op. Separately, extending
`scripts/check-instructions-name-installed-tools.sh` to the refusal strings in
`scripts/hooks/checks/*.core.ts` would have caught the `ss` advice itself.

**Similar instances:** `grep -rn "ss -\|lsof\|fuser" scripts/hooks/checks`
finds no port-lookup advice left in any check (measured on 2026-11-27).
