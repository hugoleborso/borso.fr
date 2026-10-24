---
date: 2026-10-24
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#194'
fix-pr: none (opened by the kaizen pull request for #194)
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-claude-harness-active.sh, .husky/pre-commit, .claude/hooks/session-start.sh]
time-to-detect: hours
tags: [hooks, harness, claude-code, session-start, knowledge]
zone: .claude/hooks/session-start.sh
recurs: none (the earlier attached-repository case is a knowledge entry, not a dantotsu; no dantotsu covers hooks that never load)
---

# The hooks that never loaded

## Symptom

On PR #194 the session hit two traps that already had knowledge entries. A second Playwright context to screenshot talos in dark mode landed on `/login`, which `screenshotting-talos-behind-its-passkey.md` describes. A `pgrep -f` meant to stop the dev server matched the session's own shell and killed it (exit 144), which `pgrep-f-matches-its-own-wait-loop.md` describes. Both entries have a trigger that matched the command that was run. Neither was printed. `KAIZEN.md` stayed empty for the whole task.

## Root-cause chain

1. **Why was neither entry printed?** `knowledge-triggers.sh` never ran. Run by hand with the same command, it prints the `pgrep` entry.
2. **Why did it not run?** No hook of `.claude/settings.json` ran in this session: no SessionStart output, no blueprint context, no guard. In the Bash tool, `CLAUDE_PROJECT_DIR` was empty, and the shell kept resetting to `/home/user`.
3. **Why?** The hosted session held two clones, `/home/user/borso.fr` and `/home/user/talos`, and started in their parent folder. Claude Code loads project settings from the project folder only. Both `CLAUDE.md` files were loaded as additional directories, so the session read the rules and believed the harness was there. Talos's own SessionStart did not run either, so its `.contexte/session.md` was never written.
4. **Why did nothing say so?** Every signal that the harness is on comes from the harness itself. When it is off, it is silent. The existing entry on this case, `borso-fr-attached-to-another-repositorys-session.md`, is delivered by an output trigger, which is a hook too.

**Root cause:** thought the repository's hooks run in any session that works in this clone, actually they run only when the session's project folder is this clone, and nothing outside the hooks noticed when they did not.

## Detection failure causes

- **Linter / static analysis:** not applicable; the gap is in the session, not in the code.
- **Functional validation locally:** the husky hooks ran and passed. They live in the clone and cannot tell a commit from an agent without its harness from any other commit.
- **Code review:** the diff was correct. The cost was the extra rounds and the empty friction log.

## Countermeasure

None was needed for PR #194 itself: the screenshot was retaken by hand and the dev server stopped by PID.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit)

**Reference:** commit adding this file, in the kaizen pull request for #194.

**The actual fix:**

```diff
 # .claude/hooks/session-start.sh
 bash "$REPO_ROOT/scripts/install-repo-deps.sh"
+
+(cd "$REPO_ROOT" && scripts/check-claude-harness-active.sh --record)
```

```diff
 # .husky/pre-commit
 changed=$(git diff --cached --name-only --diff-filter=ACMR)
+
+scripts/check-claude-harness-active.sh
```

SessionStart records `CLAUDE_CODE_SESSION_ID` in the shared git directory, so worktrees see it. A commit made under Claude Code (`CLAUDECODE=1`) from a session that is not recorded is refused once, with the reason. `--acknowledge` runs `install-repo-deps.sh`, which creates `KAIZEN.md` and the generated indexes, then records the session. Commits made outside Claude Code are never concerned. A canary in `scripts/standards/canary-registry.ts` plants an unrecorded session and expects the refusal.

The refusal arrives at the first commit, not the first tool call: nothing in the repository runs earlier in a session that loaded none of its settings. Making the hooks load in such a session is an environment setting outside this repository.

**Sibling defects swept:** the talos repository has the same gap: its SessionStart writes `.contexte/session.md`, which its `CLAUDE.md` makes the first action of every session. That repository is not changed here; it needs Hugo's decision.

## See also

- [`borso-fr-attached-to-another-repositorys-session.md`](../knowledge/borso-fr-attached-to-another-repositorys-session.md)
- [`screenshotting-talos-behind-its-passkey.md`](../knowledge/screenshotting-talos-behind-its-passkey.md)
- [`pgrep-f-matches-its-own-wait-loop.md`](../knowledge/pgrep-f-matches-its-own-wait-loop.md)
