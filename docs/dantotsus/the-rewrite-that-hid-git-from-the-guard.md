---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#157, #163, #164, #166'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 1
eradication-paths: [.claude/hooks/rtk-rewrite.sh]
time-to-detect: minutes
tags: [hooks, agents, git, harness, claude-code]
zone: .claude/hooks/rtk-rewrite.sh
recurs: none (the earlier rtk entries are about its installer and its biome rewrite; this is how its rewrite meets the worktree guard)
---

# The rewrite that hid git from the guard

## Symptom

A subagent dispatched with worktree isolation typed `git status` and was
refused:

> this command runs rtk with the text git status in a plain command, so what
> it runs cannot be shown not to be git. Refusing to run it

Loops, pipes and globs failed the same way even when git was not in them.
Only `/usr/bin/git` worked, and nothing said so. It was logged by most of the
twelve agents of one weekend, and by two feature runs before them.

## Root-cause chain

1. **Why was `git status` refused?** Claude Code's worktree guard lets a git
   command through only when it can see that git targets the agent's worktree.
2. **Why could it not see that?** The command it was asked to approve was
   `rtk git status`: the repository's PreToolUse hook had rewritten it.
3. **Why were loops refused too?** rtk also rewrites `grep`, `ls` and others
   inside compound commands, and the guard cannot read past a launcher inside
   a construct, so any rewritten loop was refused as possibly git.
4. **Why only `/usr/bin/git`?** rtk does not rewrite an absolute path.

**Root cause:** the rewrite hook was written for a session working in one
checkout, but in a worktree-isolated agent a second hook judges the rewritten
command, and a launcher in front of git is exactly what that hook refuses.

## Detection failure causes

- **Typing / linter:** not applicable; the two hooks belong to different
  owners and only meet at run time.
- **Functional validation locally:** the main session works in the main
  checkout, where the guard does not run, so the person editing the hook never
  sees it.

## Countermeasure

In a linked worktree (the hook's `cwd` has a git dir different from its
common dir), the hook leaves untouched any command that names git as a word
or is more than one plain command. Simple commands keep their rtk rewrite, and
the main checkout keeps every rewrite.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

```diff
+GIT_COMMAND_WORD='(^|[^[:alnum:]_./-])git($|[^[:alnum:]_.-])'
+COMPOUND_COMMAND=$'[;|&<>`\n]|\\$\\('
+if [[ "$CMD" =~ $GIT_COMMAND_WORD ]] || [[ "$CMD" =~ $COMPOUND_COMMAND ]]; then
+  HOOK_CWD=$(jq -r '.cwd // empty' <<<"$INPUT")
+  OWN_GIT_DIR=$(git -C "$HOOK_CWD" rev-parse --path-format=absolute --git-dir 2>/dev/null || true)
+  SHARED_GIT_DIR=$(git -C "$HOOK_CWD" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
+  if [ -n "$OWN_GIT_DIR" ] && [ "$OWN_GIT_DIR" != "$SHARED_GIT_DIR" ]; then
+    exit 0
+  fi
+fi
```

Checked by feeding the hook its JSON input: in the worktree, `git status`, a
loop, a pipe and a command substitution came back unchanged while `ls -la`
became `rtk ls -la`; in the main checkout `git status` still became
`rtk git status`. A live `git status` in the worktree then ran.

The change removes an automatic approval rather than adding one: an
unrewritten command goes through the normal permission flow, and the guards
in `plugins/borso-harness/hooks/` see the same text as before, so
`scripts/check-hook-decisions.sh` is unaffected.

What remains is the guard's own reading of shell text: a heredoc or a loop
whose text mentions git is still refused. That is Claude Code's, not this
repository's; [`../knowledge/the-worktree-guard-reads-shell-text.md`](../knowledge/the-worktree-guard-reads-shell-text.md)
says how to work with it and is printed when the refusal appears.

**Sibling defects swept:** the biome skip in the same hook is the other case
of rtk rewriting a command into one that fails.

## See also

- [`../knowledge/the-worktree-guard-reads-shell-text.md`](../knowledge/the-worktree-guard-reads-shell-text.md)
