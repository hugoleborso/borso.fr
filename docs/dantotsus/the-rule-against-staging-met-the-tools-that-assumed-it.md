---
date: 2026-11-14
introduced-at: conception
detected-at: local
severity: low
related-pr: '#334'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/quality/check-dantotsu-front-matter.ts, scripts/quality/dantotsu-corpus.ts, .claude/hooks/pretool-subagent-no-staging.sh]
time-to-detect: minutes
tags: [agents, hooks, git, gates, harness]
zone: scripts/quality/check-dantotsu-front-matter.ts
recurs: [a-rename-that-staged-itself]
---

# The rule against staging met the tools that assumed it

## User impact

The operator saw nothing. PR #334 shipped a hook that stops subagents from
staging. Two tools a subagent uses on a dantotsu still expected staging, and
both refused the subagents of that same session.

| | Seen | Expected |
| --- | --- | --- |
| A subagent checks its dantotsu | `check-dantotsu-front-matter` refused its eradication path as not tracked | a subagent can turn its own entry green before handing back |
| A subagent reads git's options | the staging hook refused `git mv -h` | `-h` writes nothing, so it runs |

Both were logged in PR #334's friction log. The first was logged by a subagent,
the second by the hook.

## Causal chain

- Two subagents were refused for work the rule meant to allow.
  - The front-matter check accepts only paths git has tracked, so a new file
    passes only once staged. The staging hook refuses `git mv` in any form,
    `-h` included.
    - The hook went live mid-session. The tools around it had been written for
      agents that stage.

## Root cause of occurrence

*Thought a new constraint on subagents only removes commands, actually it also
removes a state, staged, that other tools read.*

`readPathsEverTracked()` reads `git ls-files` and history. An untracked file is
in neither. The container also has no man pages: `git help mv` prints "This
system has been minimized" (measured), so `git mv -h` is the only git manual a
subagent has without the network.

## Detection failure causes

- **Conception:** PR #334 listed what the hook refuses. It did not list which
  tools assume the caller stages.
- **Review:** the sweep's own inventory, rows S1 and S6, saw both refusals and
  called each a single retry. The entry `a-rename-that-staged-itself` says of
  `-h` that "the refusal costs one retry, so it stays".

## Countermeasure

- Run by hand, the front-matter check also accepts untracked paths. With
  `--staged`, as pre-commit runs it, it still reads tracked paths only, because
  a commit must carry the files its entry names.
- The staging hook cuts `git add|mv|rm|commit -h` and `--help` before matching.
- The knowledge entry on reading sources now lists `git <sub> -h` as the way to
  read git's options here.

## Eradication

**Type:** structural impossibility (level 1). Neither tool can refuse a subagent
for not staging.

**Reference:** this commit.

```diff
+function readPathsTheCheckAccepts(isStaged: boolean): ReadonlySet<string> {
+  const everTracked = readPathsEverTracked();
+  return isStaged ? everTracked : new Set([...everTracked, ...readUntrackedPaths()]);
+}
```

```bash
HELP_INVOCATION='git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(add|mv|rm|commit)[[:space:]]+(-h|--help)([[:space:]]*($|[;&|)]))'
COMMAND_TO_RUN="$(sed -E "s/${HELP_INVOCATION}/true\\5/g" <<<"$COMMAND_TO_RUN")"
```

**Proof it can fail:** the hook, fed JSON with `agent_id` set and
`KAIZEN_LOG_REFUSALS=0`:

```text
0 <= git mv -h
0 <= git add --help
0 <= cd /home/user/borso.fr && git mv -h; echo x
2 <= git mv a b
2 <= git mv -h && git add x
2 <= git commit -m hi
2 <= git rm -h; git rm a
```

The check, run by hand while this sweep's new files were untracked, on
`origin/main`'s version and then on this one:

```text
before  the-merge-that-linted-against-dependencies-it-never-installed: eradication path scripts/ensure-installed.sh was never in the repository
before  the-push-that-waited-for-another-agents-probe: eradication path scripts/knip/skip-untracked-files.ts was never in the repository
after   [check-dantotsu-front-matter] 313 dantotsus carry a complete, resolvable front matter
```

**Similar instances:** `grep -rn 'ls-files' scripts --include=*.ts` lists the
other readers of tracked paths. `weak-points.ts` runs in CI on committed trees,
where tracked and on disk are the same.
