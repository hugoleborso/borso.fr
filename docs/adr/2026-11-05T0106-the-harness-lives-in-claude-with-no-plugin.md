# ADR-2026-11-05T0106: The harness lives in .claude/ with no plugin

- **Status:** accepted
- **Date:** 2026-11-05
- **Deciders:** Hugo Borsoni
- **Tags:** meta, harness
- **Supersedes:** [ADR-2026-10-05T1023](./2026-10-05T1023-the-harness-ships-as-a-plugin-linked-into-claude.md)

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| The skills sit in `.claude/` and the plugin is gone | operator | high | The operator asked for it on 2026-11-05 | Whether `plugins/` exists |
| One copy, no indirection | author | high | Links, a link checker and a path resolver are three things to keep in step | Count of scripts that exist only to locate the harness |
| A cloud session loads every part | author | high | ADR-2026-10-05T1023 measured that a cloud session skips an untrusted plugin | Whether each skill, agent, command and hook is a plain file Claude Code reads from `.claude/` |

## Context

ADR-2026-10-05T1023 packaged the harness as `plugins/borso-harness/` so that `hugoleborso/talos` could vendor borso.fr as a submodule and load the same skills. Talos now lives in this monorepo, at `apps/talos/` (measured, `ls apps` on 2026-11-05). The plugin has no consumer outside this repository. It still costs a symlink per part, `link-into.sh` and `check-harness-links.sh` to keep the links in step, `harness-path.sh` and `.claude/borso-harness.json` to resolve paths for other repositories, a SessionStart hook that exports `CLAUDE_PLUGIN_ROOT`, and a `.claude-plugin/marketplace.json`.

## Decision

**Move every part of the harness into `.claude/` as plain files and delete `plugins/borso-harness/`.** Skills go to `.claude/skills/`, agents to `.claude/agents/`, the command to `.claude/commands/`, hooks to `.claude/hooks/`. `kaizen.sh` and `knowledge-triggers.py` go to `scripts/`. The skills name their files by repository path, such as `.claude/skills/adr/standard.md`. The hooks and scripts hard-code borso.fr's paths.

## Consequences

- `+` One copy of each file, edited where Claude Code reads it.
- `+` `link-into.sh`, `check-harness-links.sh`, `harness-path.sh`, the marketplace and the `CLAUDE_PLUGIN_ROOT` export are gone.
- `-` Another repository can no longer install the harness as a plugin or vendor it through a submodule. It would have to copy the files.
- `~` `session-env.sh` stays for its other job, giving the shell a `TMPDIR`.

## Alternatives considered

### Option A: plain files in `.claude/` (chosen)

- **Summary:** as above.
- **Strengths:** meets all three criteria.
- **Costs:** no reuse outside this repository.
- **Rationale:** the only consumer that needed reuse moved in.

### Option B: keep the plugin and its links (rejected)

- **Summary:** ADR-2026-10-05T1023 as it stands.
- **Strengths:** another repository can still vendor it.
- **Costs:** the links, the checker, the path resolver and the environment export.
- **Rejection rationale:** fails the operator's criterion, and pays for reuse nobody uses.

### Option C: do nothing (rejected)

- **Summary:** same as B.
- **Rejection rationale:** same as B.

## Evaluation rubric

|             | Option A | Option B | Option C |
|---|---|---|---|
| The skills sit in `.claude/` and the plugin is gone | ✓ | ✗ | ✗ |
| One copy, no indirection | ✓ | ✗ links and resolver | ✗ links and resolver |
| A cloud session loads every part | ✓ plain files | ✓ through links | ✓ through links |

## Implementation pointers

- Files: `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.claude/hooks/`, `.claude/settings.json`, `scripts/kaizen.sh`, `scripts/knowledge-triggers.py`
- Related ADRs: ADR-2026-10-05T1023, superseded. ADR-2026-10-10T0122, whose hook and compiler moved.
