---
date: 2026-10-02
introduced-at: conception
detected-at: local
severity: low
related-pr: '#107'
fix-commits: [57fb0a3834]
eradication-level: 2
eradication-paths: [scripts/check-instructions-name-installed-tools.sh]
time-to-detect: hours
tags: [pnpm, gates, pre-commit, agents, spec]
zone: .claude/skills
recurs: [the-skill-that-named-the-linter-the-repository-deleted]
---

# The workspace name that was never checked

## User impact

PR #107's plan listed its pre-flight gates as `pnpm --filter @borso/pragma
typecheck`, `… build` and `… run test`. Each one, run as written, answered:

```
No projects matched the filters in "/home/user/borso.fr"
```

The author hit it on the first gate, and the second technical validator logged
it in the kaizen journal (measured by both sessions). The package is
`@borso-app/pragma`.

| | Seen | Expected |
| --- | --- | --- |
| A validator runs the plan's first gate | "No projects matched the filters" | The pragma typecheck runs |

## Causal chain

- The plan's gate commands matched no workspace.
  - The plan named `@borso/pragma`, a package that does not exist. The faulty
    lines, from `5760ce327` (`docs/features/pragma/…/plan/plan.md`):

    ```markdown
    2. `pnpm --filter @borso/pragma typecheck`.
    4. `pnpm --filter @borso/pragma build`.
    ```

    - The agent writing the plan filled the template's placeholder,
      `pnpm --filter <pkg> build`
      (`.claude/skills/technical-conception/template.md:56`, unchanged today).
      - The placeholder asks for a scoped package name, in a repo with two
        scope conventions. The infrastructure packages are `@borso/infra` and
        `@borso/shared-infra`. The apps are `@borso-app/<slug>`. The name was
        filled from the agent's prior, which blended the two (inferred: no
        transcript of that session survives). **Material.**

## Root cause of occurrence

*Thought the package of an app follows the `@borso/` scope the infrastructure
packages use, actually apps live under `@borso-app/`, and the template asks
for the scoped name without carrying it.* **Material.**

The right fact sat in `apps/pragma/package.json` and in every earlier pragma
plan. At the parent of `5760ce327`, `git grep -c "filter @borso-app/pragma"`
finds it in five feature plans, among them `first-features` and
`lineup-editor`. The wrong scope appears only once before, in the
audience-song-voting brief. So a correct example existed. It was not in the
agent's context when it filled `<pkg>` (inferred), which makes the template,
the input that asked for the name, the cause under the agentic 4M rule.

## Detection failure causes

- **Linter / static analysis:** `check-instructions-name-installed-tools.sh`
  already refused a `pnpm exec` naming a missing tool, but only in `.claude/`
  and `docs/standards/`, and it did not read `--filter` arguments.
- **Self-validation:** the author ran the first gate and corrected it in the
  session, but did not correct the plan until a validator flagged it.
- **Friction sweep:** the audience-song-voting brief had named
  `@borso/pragma` a month earlier, and its kaizen log recorded it. No sweep
  turned that log line into a gate.

## Countermeasure

The plan's four gates were corrected in PR #107 (`17f63e7c3`).

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `57fb0a3834`.

`check-instructions-name-installed-tools.sh` now reads every `pnpm --filter X`
across the skills, the standards, and every feature's `plan/` and `spec/`,
and fails when `X` names no workspace, matching the way pnpm does. It runs in
`.husky/pre-commit` and in `.github/workflows/ci.yml`, and exits 1.

```diff
+FILTER_SURFACES=('.claude/*' 'docs/standards/*' 'docs/features/*/*/plan/*' 'docs/features/*/*/spec/*')
+  case "$filter" in *'<'* | *'$'* | *'*'* | *'...'* | ./*) continue ;; esac
+  if ! printf '%s\n' "$workspace_names" | grep -qxF -e "$filter" -e "@borso-app/$filter" -e "@borso/$filter"; then
```

A name without its scope passes, because pnpm resolves `last-loop-lepin` to
`@borso-app/last-loop-lepin`. A placeholder is skipped.

**Proof it can fail:** re-adding PR #107's line to its plan makes the check
name the file, the line and the filter, then exit 1.

**Proposed:** subtract the scope from the template. If
`.claude/skills/technical-conception/template.md` and the copy in its
`SKILL.md` wrote `pnpm --filter <app-slug> build`, the folder name under
`apps/`, there would be no scope left to recall. pnpm resolves a bare name
across scopes, as the check above already relies on. The gate stays as the
catch for a hand-typed scope.

**Similar instances:** the same commit fixed two stale filters on the tree.
The race-day-live spec named `@borso/last-loop-lepin`. The tech-lead
orchestrator's plan still ran gates on two skill packages deleted when skills
became markdown-only. `grep -rn "pnpm --filter <" .claude/skills` lists the
placeholders the proposal would touch.
