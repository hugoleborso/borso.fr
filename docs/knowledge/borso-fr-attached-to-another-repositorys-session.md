---
summary: 'Working here from a session started on another repository: the husky gates hold, SessionStart and the .claude hooks do not, and a shallow clone cannot record an upstream.'
triggers:
  output:
    - 'not stored as a remote-tracking branch'
    - 'never ran borso\.fr''s \.claude hooks'
---

# borso.fr attached to another repository's session

A Claude Code session started on another repository can add this one with `add_repo`, clone it, and work in it. PR #149 was made that way, from a session started on `talos`. The git gates still hold; the Claude Code harness of this repository does not.

## What still runs

The husky hooks live in the clone itself: pre-commit (the linter, the formatter, blueprints, vocabulary, doc links…), commit-msg (commitlint) and pre-push (knip, the changed apps' tests, Stryker) all ran on PR #149's commits. CI runs as on any branch.

## What does not run

- **SessionStart.** `scripts/install-repo-deps.sh` never ran: no `node_modules`, no generated blueprint index, no `KAIZEN.md`. Run it by hand right after the clone.
- **`.claude/settings.json` hooks.** The session carries the settings of the repository it started on. So the pre-write blueprint context, the rtk rewrite and this repository's guard hooks are absent, and the other repository's guards apply instead.
- **This CLAUDE.md.** `register_repo_root` asks for a reload on the next turn; until it arrives, read `CLAUDE.md` yourself before the first edit.
- **The friction log.** Nothing creates `KAIZEN.md` or reminds the agent to write to it, so the after-task sweep starts from the transcript alone. Run `scripts/kaizen.sh` from the start like in a native session.

## A session started in the folder above the clones

The same holds, with no `add_repo`, when a hosted session holds several clones side by side and starts in their parent folder: PR #194 ran from `/home/user`, holding `borso.fr` and `talos`. Both `CLAUDE.md` files load, and neither repository's `.claude/settings.json` does. `CLAUDE_PROJECT_DIR` is empty in the Bash tool and the shell keeps resetting to the parent. The talos SessionStart is silent too, so its `.contexte/session.md` is never written.

Since PR #194's kaizen, the first commit from such a session stops at `scripts/check-claude-harness-active.sh`. Run `scripts/check-claude-harness-active.sh --acknowledge`, which runs the install SessionStart would have run, then reread the knowledge entries for what you ran. See [the dantotsu](../dantotsus/the-hooks-that-never-loaded.md).

## A shallow clone has no tracking branch

`add_repo` recommends `git clone --depth 1`, which implies `--single-branch`: the fetch refspec covers `main` only. A later `git push -u origin <branch>` pushes, then cannot record the upstream:

```
fatal: upstream branch 'refs/heads/<branch>' not stored as a remote-tracking branch
```

and a stop hook that checks for an upstream reports « no remote branch » for a branch that is on GitHub. Add the branch to the refspec, then set the upstream:

```sh
git config --add remote.origin.fetch "+refs/heads/<branch>:refs/remotes/origin/<branch>"
git fetch origin
git branch -u origin/<branch>
```

Measured on 2026-10-08.
