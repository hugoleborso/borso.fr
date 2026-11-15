---
date: 2026-11-15
introduced-at: implementation
detected-at: linter
severity: low
related-pr: '#343'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/posttool-lint-write.sh, .claude/settings.json]
time-to-detect: minutes
tags: [pragma, eslint, hooks, harness, self-improvement-loop]
zone: apps/pragma/site/src/components/organisms/AppShell.tsx
weak-point: prose-stands-in-for-a-check
recurs: [the-shell-that-scrolled-inside-a-window-that-still-could]
---

# The rule that knew the answer and waited for the commit to say it

## User impact

No user saw the defect. The cost fell on the session that shipped #343.

| | Seen | Expected |
| --- | --- | --- |
| First draft of the still header | A whole implementation built on a `<main>` that scrolls | A warning at the first edit that gave `<main>` an overflow class |
| When the rule spoke | At the lint run before the commit | At the write |

The session's own log says so, at 22:51 on 2026-11-14: *"I reached for a
scrolling main to keep the header still, which a dantotsu and a lint rule
already forbid; only the lint run caught it, after the code was written."*

## Causal chain

- The session wrote a shell whose `<main>` scrolls, then rewrote it
  - The lint run before the commit reported `borso(no-scroll-container-on-main)`
    - Nothing ran that rule between the first edit and the commit
      - `posttool-format-write.sh` runs the formatter after each write and
        deliberately no linter
      - `knowledge-triggers.sh` prints knowledge entries by path, and the
        lesson lived in a dantotsu and a lint rule, which it does not read

## Root cause of occurrence

*Thought a lesson encoded as a lint rule reaches the writer; actually the rule
speaks only when lint runs, which is at the commit.*

`.claude/hooks/posttool-format-write.sh` said it plainly: *"A lint fix is
deliberately not run ... Lint stays a gate that reports, and the author fixes
it."* The reason was the autofix rewriting code. A lint report changes nothing
in the file, and nothing ran one.

## Detection failure causes

- **Hook:** no hook linted a written file. The rule existed since PR #131 and
  its message names the dantotsu, so the right words existed. They were
  delivered late.
- **Knowledge trigger:** dantotsus have no `triggers:`, so the hook that
  delivers knowledge at the moment of a write never printed this one.
- **Type-aware lint cost:** a full `oxlint` on one pragma component takes about
  4 s because tsgolint builds the workspace program (measured 2026-11-15),
  which made a per-write lint look too slow.

## Countermeasure

`.claude/hooks/posttool-lint-write.sh` runs after every Edit, Write and
MultiEdit of a `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` or `.cjs` file inside the
repository. It lints that one file with every rule except the type-aware ones,
from a config derived from `.oxlintrc.json` with `typeAware` off. That takes
about 1.1 s (measured on `AppShell.tsx`). Errors return to the agent as
`additionalContext`, so the rule's own message, with its dantotsu link, lands
one edit after the shape appears. It never blocks the edit. The commit gate
stays the enforcement and still runs the type-aware rules.

The derived config sits at the root, gitignored as `.oxlintrc.write.json`,
because oxlint resolves `jsPlugins` and override `files` globs from the
config's folder. A copy in `node_modules/.cache/` loaded but matched none of
the overrides, so the planted defect passed silently (measured).

This lifts every lint-backed dantotsu at once, not only this one. Lint rules
are this repository's most common eradication at level 2.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit on branch `claude/lessons-from-pr-343`, this entry's own
commit.

```diff
       {
         "matcher": "Edit|Write|MultiEdit",
         "hooks": [
           { "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/posttool-format-write.sh" },
+          { "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/posttool-lint-write.sh",
+            "statusMessage": "Linting the edited file" }
         ]
       },
```

**Proof it can fail:** a scratch copy of `AppShell.tsx` with
`overflow-y-auto` added to `<main>`, fed to the hook as a PostToolUse Edit,
returned in 1.085 s:

```text
[lint] The file just written breaks a rule the commit gate enforces. ...
apps/pragma/site/src/components/organisms/ScratchShell.tsx:70:7: A <main> that
scrolls is a second scroller inside a window that can still scroll. ...
See docs/dantotsus/the-shell-that-scrolled-inside-a-window-that-still-could.md.
[Error/borso(no-scroll-container-on-main)]
```

The unchanged `AppShell.tsx` returned nothing and exit 0 in 1.169 s. The
scratch file was deleted.

**Similar instances:** `grep -l 'eradication-paths: \[eslint-rules' docs/dantotsus/*.md`
lists the dantotsus whose eradication is a custom rule. Each of them now speaks
at the write.
