---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#89'
fix-pr: '#106'
fix-commits: []
eradication-level: 2
time-to-detect: days
tags: [agents, skills, eslint, biome, tooling, gates, meta, documentation]
---

# The skill that named the linter the repository had deleted

## Symptom

`.claude/agents/technical-validator.md` is the brief the code-review agent
runs from. Its verdict table held this row:

```
| B02 | Biome lint clean | `pnpm exec biome lint` | <exit 0 / N errors> | PASS / FAIL |
```

There is no Biome in this repository.
[ADR-0007](../adr/0007-eslint-with-type-aware-rules-replaces-biome.md)
replaced it with ESLint on 2026-08-08. The dependency went, `biome.jsonc`
went, the hooks were rewritten. Eleven tracked files under `.claude/` went on
naming it.

The agent that runs that brief is asked to fill in a verdict. It runs the
command it was given, gets `command not found`, and has to decide — alone,
mid-verdict — whether a lint gate that cannot be run is a FAIL or an
UNVERIFIABLE. Four agents hit this across a month, in separate tasks, each
losing part of a turn to it.

The same brief also told the agent to read *"the repo's lint config at
`biome.jsonc` (and per-app overrides under `apps/*/biome.jsonc`)"*. None of
those paths exist either, so the one input the cleanliness category is built
on was a file the agent could not open.

Beside it, a subtler one: the orchestrator's dispatch-hygiene rule read
*"briefs name `biome check`, not `biome lint`"*. The lesson underneath it is
real and still applies — a brief naming one half of a two-part gate lets the
other half drift a round at a time — but it was written in the vocabulary of
a tool where the two halves were sub-commands of one command. Under ESLint
and Prettier they are two separate commands, which makes the trap *easier* to
fall into, and the rule as written pointed at neither of them.

## Root-cause chain

1. **Why did the skills still name Biome?**
   ADR-0007's change swept the code: the manifest, the config, the hooks, the
   workflows. It did not sweep `.claude/`.

2. **Why not?**
   Nothing in `.claude/` is imported, built, typechecked or linted. Removing a
   dependency breaks every file that imports it, loudly and immediately.
   Removing a dependency breaks no file that merely *mentions* it, and prose
   has no build step.

3. **Why did a month of agent runs not surface it?**
   Because each one absorbed it. An agent that cannot run a command works
   around it — it greps instead, or marks the row UNVERIFIABLE and moves on.
   The cost is real and paid every time, and it never accumulates anywhere a
   human reads.

4. **Why did the enforcement ledger not catch it?**
   The ledger resolves the mechanisms that `docs/standards/` claims. It does
   not read `.claude/`, and a skill is not a standard: nothing there claims
   enforcement, it just tells an agent what to do.

5. **Why did the four agents not report it?**
   None of them was told to. A friction line from a subagent only reaches a
   sweep if the prompt that spawned it asked for one — the case CLAUDE.md
   makes under *Subagents log here too*. Four agents hitting one wall is the
   evidence that promotes a local fix into a gate, and it was only visible
   because this sweep read `KAIZEN.md` by writer rather than by line.

**Root cause:** the author thought *removing a tool is a code change*,
actually *a skill is executable text and removing a tool is a change to
everything that instructs*, and the difference is invisible precisely because
the instruction surface is the one surface with no compiler.

## Detection failure causes

- **Typing / linter:** markdown under `.claude/`; ESLint does not lint it and
  there is nothing to type.
- **Functional validation locally:** running a skill is not something the
  repository does. A skill is exercised by an agent, in a session, one at a
  time.
- **CI:** no job reads `.claude/` for anything but the hook-decision contract,
  which checks hooks, not skills.
- **The enforcement ledger:** scoped to `docs/standards/`, by design.
- **Code review:** ADR-0007's diff was large and touched the things that
  break. A reviewer checking that the build is green is checking exactly the
  set of files this defect is not in.
- **The agents themselves:** four hit it and each absorbed it, because an
  agent's job is to finish the task, and working around a broken instruction
  is finishing the task.

## Countermeasure

Every invocation swept, and every instruction rewritten to name what actually
runs rather than deleted and left vague:

- **`.claude/agents/technical-validator.md`** — `biome.jsonc` becomes
  `eslint.config.js` and `eslint-rules/`; row B02 becomes ESLint with
  `--no-warn-ignored --max-warnings 0`, because ESLint exits 0 on a warning
  and a warning nobody has to clear is a rule that is off.
- **`technical-conception`, `technical-validation`, `implementation`, `adr`,
  `dantotsu`, `after-task-dantotsus`** — same substitution, with the
  type-assertion rule named as `borso/no-type-assertion-except-unknown`
  rather than "the Biome plugin".
- **The dispatch-hygiene rule** rewritten to the lesson rather than the tool:
  *a brief names every half of the gate*, with ESLint and Prettier named as
  the two halves, and a note that two separate commands make the trap easier
  than two sub-commands did. Updated in the orchestrator standard,
  `feature-pipeline.md` and
  [`orchestrator-dispatch-hygiene.md`](../knowledge/orchestrator-dispatch-hygiene.md).
- **The four `docs/knowledge/biome-*.md` entries** keep their content, which
  is a set of true facts about Biome, and gain a banner saying Biome is not
  installed here and pointing at ADR-0007. A reader searching for
  `biome-ignore` was landing on a page that read as current guidance.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** PR #106 · `scripts/check-instructions-name-installed-tools.sh`

Every `pnpm exec X`, `npx X` and `node_modules/.bin/X` named in `.claude/` or
`docs/standards/` has to resolve in `node_modules/.bin`:

```diff
+git ls-files "${INSTRUCTION_SURFACES[@]}" |
+  grep -E '\.(md|sh)$' |
+  xargs grep -onE '(pnpm exec|npx|node_modules/\.bin/) +[a-z@][a-zA-Z0-9@/._-]*' |
+  …
+  if [ ! -e "${BIN_DIR}/${tool}" ]; then
+    echo "[check-instructions-name-installed-tools] ${location}: names \`${tool}\`, which is not installed" >&2
```

It reads the actionable half — the command an agent will type — and says
nothing about prose, which is where a retired tool is legitimately named: in
the ADR that retired it, in the dantotsus written while it ran, in a standard
explaining what replaced it. Measured on the tree it was written against: four
distinct tools named across the surfaces (`tsx`, `eslint`, `knip`,
`prettier`), all resolving. Verified to fire by restoring `pnpm exec biome
lint` in the validator brief, which exits 1 naming the file and line.

It skips itself, saying so, when `node_modules/.bin` is absent, because a gate
that fails on a fresh checkout is a gate someone deletes.

**What it does not reach:** a stale instruction that names no command —
*"read the repo's lint config at `biome.jsonc`"* is prose by this gate's
definition and would have survived it. That half was swept by hand here. A
gate on every backticked path in every skill is a different and much noisier
proposition, and the case for it is weaker: an agent told to read a file that
does not exist gets a clean signal and no verdict to fill in.

**Sibling defects swept:** the eleven files above, plus the four knowledge
entries' banners.

## See also

- [ADR-0007](../adr/0007-eslint-with-type-aware-rules-replaces-biome.md) — the decision whose sweep stopped at the code.
- [`the-formatter-was-a-detector-with-no-writer.md`](./the-formatter-was-a-detector-with-no-writer.md) — the other half of the formatter story.
- [`orchestrator-dispatch-hygiene.md`](../knowledge/orchestrator-dispatch-hygiene.md) — the dispatch rule, now written as the lesson rather than the tool.
