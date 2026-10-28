---
date: 2026-10-27
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#199'
fix-pr: '#202'
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/hooks/pretool-gh-pr-create.sh, .gitignore]
time-to-detect: 2 days
tags: [self-improvement-loop, harness, hooks, agents, meta]
zone: plugins/borso-harness/hooks
weak-point: prose-stands-in-for-a-check
recurs: [a-knowledge-entry-did-not-stop-the-second-hit]
---

# The friction log that never left the container

## Symptom

PR #199 was built on claude.ai/code and merged from a laptop two days later.
The sweep that was supposed to read its friction log opened `KAIZEN.md` and
found five entries about a different feature. Everything PR #199 had learned
the hard way had to be rebuilt from thirteen commit messages, a CI history and
a pull-request body.

## Root-cause chain

1. **Why was the log not there?**
   `KAIZEN.md` is gitignored by design, so it lives on the machine that wrote
   it and travels nowhere.
2. **Why did that matter here?**
   The session that wrote it was hosted. Its container was reclaimed when the
   session ended, and the sweep ran later in a different one.
3. **Why did nothing carry it across?**
   `scripts/kaizen.sh archive <slug>` exists for exactly this, and nobody ran
   it.
4. **Why did nobody run it?**
   CLAUDE.md says to, in a paragraph under *Self-improvement loop*, addressed
   to a session that is about to finish. Finishing is not an event. There is no
   call at that moment for a hook to attach to, and no file whose state says
   whether the step was taken.
5. **Why was a paragraph thought to be enough?**
   The same paragraph records that this already happened once, on a session
   that logged 33 entries from twelve agents and would have lost all of them.
   The response to the first occurrence was to write the warning.

**Root cause:** thought an instruction aimed at the end of a session will be
followed, actually a session has no end it can act on — and the one moment the
log and the branch are provably in the same place is the pull request.

## Detection failure causes

- **Linter / static analysis:** the file is gitignored; nothing lints it.
- **CI (tests / build):** CI sees the branch. The absence of a file that was
  never meant to be committed is invisible there.
- **Code review:** a missing archive looks exactly like a task with no
  friction, and a task with no friction is a legitimate outcome.
- **The loop itself:** `/after-task-kaizen` discovers the loss at the one
  moment it can do nothing about it.

## Countermeasure

- **Code:** `gh pr create` refuses while the friction log holds entries and the
  branch commits no archive of it.
- **Operator action:** none; the refusal names the command.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the hook that already guards `gh pr create`)

**Reference:** PR #202 · commit `self`

**The actual fix:** the pull request is the event CLAUDE.md's paragraph did not
have.

```diff
+if [[ -f "$KAIZEN_FILE" ]]; then
+  LOGGED="$(grep -c '^- \[' "$KAIZEN_FILE" || true)"
+  ARCHIVED_HERE="$(git -C "$REPO_ROOT" diff --name-only origin/main...HEAD 2>/dev/null \
+    | grep -c "^$FEATURES_DIRECTORY/.*/kaizen\.md$" || true)"
+  if [[ "$LOGGED" -gt 0 && "$ARCHIVED_HERE" -eq 0 ]]; then
+    echo "[open-pr] the friction log holds $LOGGED entr(y/ies) and this branch commits no archive of it." >&2
+    exit 2
+  fi
+fi
```

The archive has to be on *this* branch. Asking whether one exists anywhere
answers yes for every branch, because the tree holds every past feature's log —
which is the version of this check that was written first and passed on a
branch that archived nothing.

It fired on this very pull request, on five entries from the talos work that
had been sitting unswept in the log; they are archived with the rest.

**And the archive could not be committed from a Mac.** `.gitignore` carried the
pattern unanchored:

```diff
-KAIZEN.md
+/KAIZEN.md
```

An unanchored pattern matches at every depth, and on a case-insensitive
filesystem it also matches `kaizen.md`, which is the name `archive` writes. So
`git add` skipped the archive in silence, on the machine where this sweep ran,
while every archive committed before this one came from a Linux container where
the two names differ. The gate above would have refused every pull request from
a Mac, forever, for a file the repository would not accept — which is how this
was found, one command after the gate started working.

**Sibling defects swept:** none. The `archive` subcommand already merges rather
than overwrites, after a task where three agents archiving in turn left only
the last one's entries.

## See also

- [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md)
- [`subagents-that-were-never-told-their-label.md`](../knowledge/subagents-that-were-never-told-their-label.md)
- [`docs/quality/weak-points.md`](../quality/weak-points.md)
