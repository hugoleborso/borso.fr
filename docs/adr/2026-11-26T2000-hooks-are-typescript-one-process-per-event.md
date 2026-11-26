# ADR-2026-11-26T2000: Hooks are TypeScript, one node process per event

- **Status:** proposed
- **Date:** 2026-11-26
- **Deciders:** hugoleborso
- **Tags:** meta, hooks, tooling

## Context

The repository's Claude Code hooks are 29 bash scripts and 4 Python scripts
under `.claude/hooks/`, 2,176 lines in all (measured with `wc -l`). None of
them is formatted, linted, type-checked or unit-tested, because oxfmt, oxlint,
tsc and vitest only read JavaScript and TypeScript. On PR #411 a session packed
a new bash hook into one-liners to pass the sweep's line balance, and nothing
refused it. Ten Bash hooks each pipe the command through two Python strippers
and then guess at it with a regular expression. Every hook is its own
process, so one Bash tool call starts 12 PreToolUse hooks.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| The formatter and linter hold hook code | operator | high | A crammed hook passed every gate on PR #411 | `oxfmt` rewrites a one-liner on write; `oxlint` names a broken rule |
| No hidden slowdown on each tool call | operator | high | Hooks run before and after every tool call | Time per Bash call over 10 runs |
| A hook tells a command from a mention | author | medium | Python strippers and regexes guessed, and each hook re-parsed the same command | A test over chains, substitutions, quotes and heredocs |

## Decision

**TypeScript run by `node`, one process per hook event.** Every hook is a
check, a pure `.core.ts` function over the parsed input and an injected
`HookWorld`, under `scripts/hooks/`. One entry per event
(`pre-tool-use.ts`, `post-tool-use.ts`, `post-tool-use-failure.ts`, `stop.ts`,
`session-start.ts`) runs every check of that event in one process. Node 24
strips the types itself, so no build step and no `tsx` run. Shell commands are
read with `unbash` 6.0.4, a typed bash parser with no dependencies, which knip
already installed. A gate refuses any hook command in `.claude/settings.json`
that is not `node scripts/hooks/<event>.ts`. The operator chose this option,
B, on 2026-11-26. One process per event is what keeps it from being slower.

## Consequences

- `+` Hook code gets oxfmt, oxlint, tsc, vitest coverage and mutation, like every other script.
- `+` One Bash call costs about 104 ms of hook time, against 403 ms sequential or 141 ms parallel for today's 12 Bash hooks (measured, 10 runs each).
- `+` The two Python strippers and their per-hook regexes go. Shell parsing lives in one module.
- `-` Relative imports inside `scripts/hooks/` carry `.ts`, which `tsconfig.json` allows with `allowImportingTsExtensions`.
- `-` A check that throws fails open with a `[hook-error]` line instead of stopping the call, so a broken check can go unnoticed until its test fails.
- `-` `unbash` becomes a direct dependency of the repository root.
- `~` Settings shrink to one command per event, so a new hook is a new check in a list, not a new settings entry.

## Alternatives considered

### Option B — every hook in TypeScript, one process per event (chosen)

- **Raised by:** author, chosen by the operator
- **Summary:** As in *Decision*.
- **Strengths:**
  - Every gate the repository has applies to every hook.
  - Faster than today, because 12 processes become one.
- **Costs:**
  - One rewrite of 33 hooks, held by a test that runs the old and new hooks on the same inputs.
- **Rationale:** It is the only option that meets both of the operator's criteria.

### Option A — new hooks in TypeScript, existing hooks stay bash (rejected)

- **Raised by:** author
- **Summary:** A gate refuses any new non-TypeScript hook, and the 29 bash hooks stay.
- **Strengths:** No rewrite, and old hooks keep their speed.
- **Costs:** 29 hooks stay outside every gate.
- **Rejection rationale:** Loses on the formatter and linter criterion for every existing hook.
- **Operator's answer:** "B." (2026-11-26)

### Option C — keep bash (rejected)

- **Raised by:** author
- **Summary:** Change nothing.
- **Strengths:** No work, no new dependency.
- **Costs:** Nothing stops the next crammed hook.
- **Rejection rationale:** Loses on the formatter and linter criterion.
- **Operator's answer:** "B." (2026-11-26)

### Option D — TypeScript, one node process per hook (rejected)

- **Raised by:** author
- **Summary:** Translate each hook file one for one, each its own `node` process.
- **Strengths:** The smallest change to settings.
- **Costs:** About 80 to 104 ms per process (measured), so 12 Bash hooks cost about 1 s run one after another.
- **Rejection rationale:** Loses on the slowdown criterion.

### Option E — TypeScript run through `tsx` (rejected)

- **Raised by:** author
- **Summary:** The runner the repository's other scripts use.
- **Strengths:** Imports without `.ts` extensions, as elsewhere in `scripts/`.
- **Costs:** About 270 ms per run (measured).
- **Rejection rationale:** Loses on the slowdown criterion, by about 170 ms per event.

## Scores

|  | B (chosen) | A | C | D | E |
|---|---|---|---|---|---|
| Formatter and linter hold hook code | ✓ every hook | ✗ 29 hooks stay outside | ✗ none | ✓ every hook | ✓ every hook |
| No hidden slowdown | ✓ 104 ms per Bash call | ✓ unchanged | ✓ unchanged | ✗ about 1 s sequential | ✗ 270 ms per event |
| Command told from a mention | ✓ one parser | ✗ strippers stay | ✗ strippers stay | ✓ one parser | ✓ one parser |

## Implementation pointers

- Spec: none. The operator's choice and the measurements are in the session of PR #411.
- Plan: none.
- Commit: stamped by `/after-task-kaizen` on merge.
- Files: `scripts/hooks/check.core.ts`, `scripts/hooks/shell-command.core.ts`, `scripts/hooks/hook-runner.adapter.ts`, `.claude/settings.json`.
- Related ADRs: none.
