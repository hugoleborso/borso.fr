---
date: 2026-10-24
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#194'
fix-commits: none (the guard added in b806f7909 was deleted in c54e32da7 and nothing replaced it)
eradication-level: 5
eradication-paths: [docs/knowledge/borso-fr-attached-to-another-repositorys-session.md]
time-to-detect: hours
tags: [hooks, harness, claude-code, session-start, knowledge]
zone: .claude/settings.json
recurs: none (the earlier attached-repository case is a knowledge entry, not a dantotsu; no dantotsu covers hooks that never load)
---

# The hooks that never loaded

## User impact

On PR #194 the session hit two traps that already had knowledge entries, and
`KAIZEN.md` stayed empty for the whole task (measured, in that session).

| | Seen | Expected |
| --- | --- | --- |
| A second Playwright context for talos in dark mode | it landed on `/login` | `screenshotting-talos-behind-its-passkey.md` printed first |
| `pgrep -f` to stop the dev server | it matched the session's own shell and killed it, exit 144 | `pgrep-f-matches-its-own-wait-loop.md` printed first |
| The friction log | empty | one line per refused call |

Both entries carry a trigger that matched the command run. Neither was
printed.

## Causal chain

- Neither knowledge entry was printed.
  - `knowledge-triggers.sh` never ran. Run by hand with the same command, it
    printed the `pgrep` entry.
    - No hook of `.claude/settings.json` ran in the session. There was no
      SessionStart output, no blueprint context and no guard.
      `CLAUDE_PROJECT_DIR` was empty in the Bash tool, and the shell kept
      resetting to `/home/user`.
      - The hosted session held two clones, `/home/user/borso.fr` and
        `/home/user/talos`, and started in their parent folder. Claude Code
        loads project settings from the project folder only. Both
        `CLAUDE.md` files loaded as additional directories, so the rules
        arrived and the hooks did not. (Machine)
        - The environment that attaches several repositories chooses the
          parent folder as the project folder. That setting lives outside
          this repository.

## Root cause of occurrence

*Thought the repository's hooks run in any session that works in this clone,
actually they run only when the session's project folder is this clone.*
(Machine)

The hosted environment attached two repositories and started the session in
their parent. `docs/knowledge/borso-fr-attached-to-another-repositorys-session.md`,
read this session: "the husky gates hold, SessionStart and the .claude hooks
do not". Had the session been set up knowing it, it would have started inside
the borso.fr clone.

## Detection failure causes

- **The harness itself:** every signal that it is on comes from a hook. When
  the hooks do not load, nothing prints, so the silence reads as a quiet
  session.
- **Knowledge:** the entry on this case reaches a session through an output
  trigger, which a hook delivers. It cannot reach a session with no hooks.
- **Git hooks:** husky ran and passed. It lives in the clone and cannot tell a
  commit from a session without its harness from any other.
- **Review:** the diff was correct. The cost was the extra rounds and the
  empty friction log.

## Countermeasure

None was needed for PR #194 itself. The screenshot was retaken by hand and the
dev server stopped by PID.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `b806f7909` (PR #195) added
`scripts/check-claude-harness-active.sh`. SessionStart recorded the session
id, and pre-commit refused a Claude Code commit from a session it had not
recorded. Commit `c54e32da7` (PR #224) deleted it by operator decision, among
the "gates that guard gates", and `grep -rn "SESSION_ID\|harness" .husky/`
finds nothing today (measured). The class is open again.

What remains is the knowledge entry
`docs/knowledge/borso-fr-attached-to-another-repositorys-session.md`. Its
triggers are output patterns, delivered by the hook runner, so it reaches only
a session whose hooks load. It does not cover the case it describes.

**Similar instances:** the talos repository has the same gap. Its SessionStart
writes `.contexte/session.md`, which its `CLAUDE.md` makes the first action of
every session, and in this session that file was never written.

**Proposed:** fix the cause where it lives, in the environment. A file under
`docs/operator-backlog/` would ask the operator to set the hosted
environment's project folder to the borso.fr clone when it attaches several
repositories. The hooks then load in every such session, and no guard has to
notice their absence after the fact. A guard in this repository can only
detect it, at the first commit, as the deleted one did.
