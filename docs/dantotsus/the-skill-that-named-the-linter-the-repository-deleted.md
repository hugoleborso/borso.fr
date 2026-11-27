---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#89'
fix-commits: [79562bd0a3]
eradication-level: 2
eradication-paths: [scripts/check-instructions-name-installed-tools.sh, .husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: days
tags: [agents, skills, eslint, biome, tooling, gates, meta, documentation]
zone: .claude/skills
weak-point: prose-stands-in-for-a-check
---

# The skill that named the linter the repository had deleted

## User impact

Every agent that ran the code-review brief between 2026-08-08 and
2026-09-16. Four of them, in separate tasks, logged the same wall in
`KAIZEN.md`, each losing part of a turn.

| | Seen | Expected |
| --- | --- | --- |
| The review agent fills row B02 of its verdict | `pnpm exec biome lint` answers `command not found`, and the agent decides alone whether that is a FAIL or an UNVERIFIABLE | The command lints the change and the row gets a verdict |
| The same brief, on the cleanliness category | "read the repo's lint config at `biome.jsonc` (and per-app overrides under `apps/*/biome.jsonc`)", none of which exists | A config file the agent can open |

## Causal chain

- The review agent ran a lint command that did not exist.
  - `.claude/agents/technical-validator.md` gave it this row. ← the faulty line

    ```markdown
    <!-- biome left the repository on 2026-08-08; this row still runs it -->
    | B02 | Biome lint clean | `pnpm exec biome lint` | <exit 0 / N errors> | PASS / FAIL |
    ```

    - `314f24821` ("replace biome with eslint and prettier", 2026-08-08, an
      agent) removed the dependency, `biome.jsonc`, the grit plugins, the
      hooks and the workflows. It changed no file under `.claude/`, and
      eleven tracked files there went on naming Biome.
      - The instructions named the tool itself, `pnpm exec biome lint`,
        rather than a command the repository owns. A tool swap therefore had
        to rewrite every instruction that ran the linter, and the swap was
        written as a code change.
        - **Method:** the instruction surface spells tools by name. The fix
          for this entry did the same, and the class came back.
          `79562bd0a` wrote `eslint.config.js` into
          `.claude/skills/technical-conception/standard.md:55`. `9dcf74547`
          (#197) then replaced ESLint with oxlint, and that line still names
          a file that does not exist (measured, `ls eslint.config.js`).

## Root cause of occurrence

*Thought removing a tool is a code change, actually a skill is executable
text, and removing a tool is a change to everything that instructs.*
**Method:** the instructions spell the tool, not a repository command, so
every swap of a tool owes a sweep of prose that nothing builds.

ADR-2026-08-08T1538 lists what the swap touched, and `.claude/` is not in it
([ADR](../adr/2026-08-08T1538-eslint-with-type-aware-rules-replaces-biome.md)).
`package.json` already defines `pnpm lint` and `pnpm format:check`, which
survive any swap.

## Detection failure causes

- **Typing and linter:** the faulty line is markdown under `.claude/`.
  Nothing lints or types it.
- **Local validation:** a skill runs only when an agent reads it in a session.
  Removing a dependency breaks every file that imports it, and no file that
  merely mentions it.
- **CI:** no job read `.claude/` except for the hook-decision contract, which
  checks hooks.
- **The enforcement ledger:** it resolves the mechanisms that
  `docs/standards/` claims, and a skill claims none.
- **Review:** `314f24821`'s diff was large and touched what breaks. A
  reviewer checking a green build checks exactly the files this defect is not
  in.
- **The agents:** four hit it and each worked around it, by grepping or by
  marking the row UNVERIFIABLE. None was told to log friction, so the cost
  reached no human until a sweep read `KAIZEN.md` by writer.

## Countermeasure

`79562bd0a` (#106) swept every invocation and rewrote each to name what runs.
Row B02 became ESLint with `--max-warnings 0`. The dispatch-hygiene rule was
rewritten as the lesson, "a brief names every half of the gate", in the
orchestrator standard, `feature-pipeline.md` and
[`orchestrator-dispatch-hygiene.md`](../knowledge/orchestrator-dispatch-hygiene.md).
The four `docs/knowledge/biome-*.md` entries gained a banner saying Biome is
not installed here.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `79562bd0a` (#106),
`scripts/check-instructions-name-installed-tools.sh`, run by
`.husky/pre-commit` and by `.github/workflows/ci.yml`.

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

It survived the swap to oxlint. Today row B02 reads
`pnpm exec oxlint --type-aware <changed-files>`, and the gate holds it.

**Proof it can fail:** restoring `pnpm exec biome lint` in the validator
brief made the gate exit 1, naming the file and the line (measured when
`79562bd0a` shipped).

The gate reads commands only. A stale file name in prose passes. That gap
let `eslint.config.js` survive in `technical-conception/standard.md:55`, and
`scripts/check-named-paths-exist.sh`, which checks paths named in prose,
passes on it because a bare root file name is not one of its surfaces.

**Proposed:** subtract the tool names. Instructions call the root scripts,
`pnpm lint` and `pnpm format:check`, which `package.json` defines, so a tool
swap touches only `package.json`. Then extend
`scripts/check-named-paths-exist.sh` to backticked root-level file names
such as `eslint.config.js`. A swap could no longer leave an instruction that
runs a missing tool, and a stale config name would be refused at commit.

**Similar instances:** `grep -rln "eslint.config.js" .claude docs/standards`
prints `.claude/skills/technical-conception/standard.md`. The eleven files
`79562bd0a` swept are listed in its diff. The other half of the formatter
story is
[`the-formatter-was-a-detector-with-no-writer.md`](./the-formatter-was-a-detector-with-no-writer.md).
