---
date: 2026-11-14
introduced-at: conception
detected-at: local
severity: low
related-pr: '#334'
fix-commits: [1e2a1d524]
eradication-level: 2
eradication-paths: [scripts/quality/check-dantotsu-front-matter.ts, scripts/quality/dantotsu-corpus.ts, scripts/hooks/checks/subagent-no-staging.core.ts]
time-to-detect: minutes
tags: [agents, hooks, git, gates, harness]
zone: scripts/hooks/checks/subagent-no-staging.core.ts
recurs: [a-rename-that-staged-itself]
---

# The rule against staging met the tools that assumed it

## User impact

The operator saw nothing. PR #334 shipped a hook that stops subagents from staging. Two tools a subagent uses on a dantotsu still expected staging, and both refused the subagents of that same session. Both refusals are in PR #334's friction log, one logged by a subagent and one by the hook.

| | Seen | Expected |
| --- | --- | --- |
| A subagent checks its new dantotsu | `check-dantotsu-front-matter` refused its eradication path as never in the repository | A subagent can turn its own entry green before handing back |
| A subagent reads git's options | The staging hook refused `git mv -h` | `-h` writes nothing, so it runs |

## Causal chain

- Two subagents were refused for work the new rule meant to allow.
  - **Branch 1.** The staging hook refused `git mv -h`.
    - Its pattern matched the words `git mv`, whatever followed them.

      ```bash
      # .claude/hooks/pretool-subagent-no-staging.sh, as added in 731066132
      STAGING_PATTERN='(^|[;&|(]|\bthen\b|\bdo\b)[[:space:]]*git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(add|mv|rm|commit)([[:space:]]|$)'
      # ❌ matches the command's name, not a write to the index
      ```

      - Commit `731066132` (PR #334, written by an agent) added the hook. Its message names the rule as a list of commands: "A new hook refuses git add, mv, rm and commit from a subagent in the shared checkout."
        - The rule was specified by the commands it bans, not by the effect it bans, a write to the shared index. A ban written as command names catches every read-only form of those commands too. (Method)
  - **Branch 2.** The front-matter check refused a new, unstaged eradication path.
    - `readPathsEverTracked()` in `scripts/quality/dantotsu-corpus.ts` reads `git ls-files` and history only, so a new file exists for it only once staged.
      - The same commit `731066132` took staging away from subagents, and listed no tool that reads staged state. The check had been written for agents that stage. (Method)

## Root cause of occurrence

*Thought banning the commands `git add|mv|rm|commit` bans writes to the shared index and nothing else, actually the same command names also cover reads (`-h`, `-n`, `--dry-run`), and other tools read the staged state the ban removes.*

Method. PR #334 stated the rule as a list of commands, so neither the hook nor its sweep asked which reads share those names, or which tools read the index. The container also has no man pages. `git help mv` prints "This system has been minimized" (measured by the first version of this entry), so `git mv -h` is the only git manual a subagent has offline.

## Detection failure causes

- **Conception:** PR #334 listed what the hook refuses. It did not list which tools assume the caller stages.
- **Review:** the sweep's own inventory, rows S1 and S6, saw both refusals and called each a single retry. [`a-rename-that-staged-itself.md`](./a-rename-that-staged-itself.md) says of `-h` that "the refusal costs one retry, so it stays".
- **Tests:** the hook's tests planted only staging commands and plain reads such as `git status`. No case planted a read-only flag of a banned command.

## Countermeasure

Commit `1e2a1d524` (PR #346):

- Run by hand, the front-matter check also accepts untracked paths. With `--staged`, as pre-commit runs it, it reads tracked paths only, because a commit must carry the files its entry names.
- The staging hook cuts `git add|mv|rm|commit -h` and `--help` before matching.

## Eradication

**Type:** DevX check (level 2). The front-matter part is structural, and the hook part is a carve-out per spelling.

**Reference:** commit [`1e2a1d524`](https://github.com/hugoleborso/borso.fr/commit/1e2a1d524) (PR #346). The hook later moved to TypeScript in `458e886c4` (PR #411) and kept the carve-out.

```ts
// scripts/quality/check-dantotsu-front-matter.ts
function readPathsTheCheckAccepts(isStaged: boolean): ReadonlySet<string> {
  const everTracked = readPathsEverTracked(MAIN_REFERENCE);
  return isStaged ? everTracked : new Set([...everTracked, ...readUntrackedPaths()]);
}
```

```ts
// scripts/hooks/checks/subagent-no-staging.core.ts
const HELP_INVOCATION = /git\s+(-C\s+\S+\s+)?(add|mv|rm|commit)\s+(-h|--help)(\s*($|[;&|)]))/gu;
```

The check cannot refuse a subagent for not staging. The hook still matches command names. It lets through only `-h` and `--help`, so `git add -n` and `git add --dry-run` are still refused in the shared checkout (read from the pattern above, not replayed). That is the gap that keeps the level at 2.

**Proposed:** in `scripts/hooks/checks/subagent-no-staging.core.ts`, replace `HELP_INVOCATION` by a test for git's documented no-write flags as a class (`-h`, `--help`, `-n`, `--dry-run`) on any banned subcommand. Add planted `git add -n` and `git rm --dry-run` cases to `subagent-no-staging.core.test.ts`. A read-only form of a banned command could then no longer be refused one spelling at a time.

**Proof it can fail:** `scripts/hooks/checks/subagent-no-staging.core.test.ts` refuses `git add x`, `git -C /repository add x` and `echo git add -h; git add x` in the shared checkout, and lets `git mv -h` and `git add --help | cat` through (read this session).

**Similar instances:** `grep -rn 'ls-files' scripts --include=*.ts` lists the other readers of tracked paths. `weak-points.ts` runs in CI on committed trees, where tracked and on disk are the same.
