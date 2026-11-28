---
date: 2026-11-28
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#431'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/agent-after-route.core.ts, scripts/hooks/hook-events.ts, .claude/skills/route/SKILL.md]
time-to-detect: minutes
tags: [hooks, harness, agents, visual-validation, spec]
zone: scripts/hooks/checks/agent-after-route.core.ts
recurs: none (the first entry about a gate a shell write walks around)
---

# The route gate that only watched the Edit tool

## User impact

The operator asked to pause two sign-up questions on pragma. The session
changed the code, committed it and tried to open the pull request, which a hook
refused. It then wrote the spec and ran the browser check after the code was
done. The operator waited on a pull request whose plan was made backwards.

| | Seen | Expected |
| --- | --- | --- |
| PR #431, 11:23 to 11:26 | code changed, committed, `create_pull_request` refused by `visual-validation` | `/route` first, then a spec, the code, and the browser check |
| PR #431, 11:29 | `spec.md` committed after `feat(pragma)` | the spec before the code, as Tier 1 step 1 says |

## Causal chain

- The pull request was refused for a missing browser check.
  - The session never planned one, because it never ran `/route`.
    - `agent-after-route` exists to stop an app edit before `/route`, and it
      never fired.
      - It listened to `Write`, `Edit`, `MultiEdit` and `NotebookEdit` only.
        The session changed `ConcertSignUpCard.tsx` and its test with
        `python3 - <<'EOF'` in `Bash` (transcript, 11:23:08 and 11:23:50).

## Root cause of occurrence

*Thought an app file is changed through the file tools, actually the harness
tells agents in auto mode to make small edits with sed, heredocs or short
scripts, and those run through `Bash`.*

The gate read the path from `tool_input.file_path`, which a `Bash` call does not
carry.

## Detection failure causes

- **The gate:** it judged the tool call, not the working tree, so any write
  path it did not list walked around it.
- **`/route`:** Tier 0 and Tier 1 did not name `/visual-validation` for a front
  end, while the `visual-validation` hook refuses the pull request without it.
  A session that had routed could still have planned no browser check.

## Countermeasure

`agent-after-route` now runs after `Bash`, `Write`, `Edit` and `MultiEdit`, and
reads `git status --porcelain -- apps/`. Any changed or new file under `apps/`
before `/route` refuses, whatever wrote it. `/route` makes a front-end change
Tier 1 at least and lists `/visual-validation` in Tier 1.

The property dropped: the gate used to refuse the write before it landed. It
now refuses right after the first one, with the change left in place.

## Eradication

**Type:** DevX check (level 2), held by the hook on every shell and file tool.

**Reference:** the commit adding this file.

```diff
-  tools: /^(Write|Edit|MultiEdit|NotebookEdit)$/u,
+  tools: /^(Bash|Write|Edit|MultiEdit)$/u,
   run: (input, world) => {
-    const appFile = readEditedAppFile(input, world);
+    const appFile = readChangedAppFile(world);
```

**Proof it can fail:** the suite feeds it a `Bash` call with
`python3 - <<'EOF'` and a dirty `apps/pragma/a.ts`, and it refuses. Stryker
kills 50 of 50 mutants on the file (measured).

**Similar instances:** `grep -n "tools: /^(Write|Edit" scripts/hooks/checks/*.ts`
lists the other checks that judge a file tool call. `format-write` and
`lint-write` already have a commit-time twin in pre-commit (read in
`.husky/pre-commit`). `no-hand-drawn-art` and `mockup-copy` do not, and stay as
they are until a shell write walks around one.
