---
date: 2026-10-02
introduced-at: conception
detected-at: local
severity: low
related-pr: "#107"
fix-pr: "#119"
fix-commits: [57fb0a3]
eradication-level: 2
time-to-detect: hours
tags: [pnpm, gates, pre-commit, agents, spec]
---

# The workspace name that was never checked

## Symptom

PR #107's plan listed its pre-flight gates as `pnpm --filter @borso/pragma
typecheck`, `… build`, `… run test`. Run as written:

```
No projects matched the filters in "/home/user/borso.fr"
```

The author hit it on the first gate, and the second technical validator
logged it in the kaizen journal. The package is `@borso-app/pragma`.

## Root-cause chain

1. **Why did the filter match nothing?** The name was invented. The two
   infrastructure packages are `@borso/infra` and `@borso/shared-infra`,
   and the apps are `@borso-app/<slug>`; the plan's author blended the two
   patterns.
2. **Why was it invented rather than read?** The plan template writes
   `pnpm --filter <pkg>`, and filling a placeholder from memory is faster
   than opening a `package.json`.
3. **Why did it reach a validator?** Nothing reads a plan's commands
   before someone runs them. `check-instructions-name-installed-tools.sh`
   already refused a `pnpm exec` naming a missing tool, but only in
   `.claude/` and `docs/standards/`, and only for tools, not workspaces.
4. **Why was it a second time?** The audience-song-voting brief had named
   `@borso/pragma` a month earlier; its kaizen log says so. The friction
   was logged and never swept into a gate.

**Root cause:** thought a package name in a plan was prose, actually it is
a command argument a validator will type.

## Detection failure causes

- **Linter / static analysis:** the installed-tools check did not read
  plans or specs, and did not read filters.
- **Self-validation:** the author ran the first gate and corrected it in
  the session, but corrected the plan only when a validator flagged it.

## Countermeasure

- **Code:** the plan's four gates were corrected in PR #107 (`17f63e7`).

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — DevX check)

**Reference:** commit `57fb0a3`

**The actual fix:** `check-instructions-name-installed-tools.sh` now also
reads every `pnpm --filter X` across the skills, the standards, and every
feature's `plan/` and `spec/`, and fails when `X` names no workspace,
matching the way pnpm does:

```diff
+FILTER_SURFACES=('.claude/*' 'docs/standards/*' 'docs/features/*/*/plan/*' 'docs/features/*/*/spec/*')
+  case "$filter" in *'<'* | *'$'* | *'*'* | *'...'* | ./*) continue ;; esac
+  if ! printf '%s\n' "$workspace_names" | grep -qxF -e "$filter" -e "@borso-app/$filter" -e "@borso/$filter"; then
```

A name without its scope passes, because pnpm resolves `last-loop-lepin`
to `@borso-app/last-loop-lepin`; a placeholder is skipped. Re-adding PR
#107's line to its plan makes the check name the file, the line and the
filter.

**Sibling defects swept:** two stale filters already on the tree. The
race-day-live spec named `@borso/last-loop-lepin`, and the tech-lead
orchestrator's plan still ran gates on two skill packages deleted when
skills became markdown-only; those steps now say they are retired. Both in
`57fb0a3`.

## See also

- [`the-skill-that-named-the-linter-the-repository-deleted.md`](./the-skill-that-named-the-linter-the-repository-deleted.md)
