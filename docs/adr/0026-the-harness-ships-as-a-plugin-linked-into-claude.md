# ADR-0026: The harness ships as a plugin and is linked into .claude/ part by part

- **Status:** proposed
- **Date:** 2026-10-05
- **Deciders:** Hugo Borsoni
- **Tags:** meta, harness

## Context

The skills, the three validator agents, the `/feature-pipeline` command and
the guard hooks lived under `.claude/` and named borso.fr's paths directly. A
second repository, `hugoleborso/talos`, needs the same harness for its own
application and will vendor borso.fr as a git submodule at `vendor/borso.fr`.
Copying `.claude/` into it would make two copies that drift, which is the
failure this repository keeps writing dantotsus about.

Claude Code has one format for sharing such a set, the plugin, and three ways
for a repository to load one. Each of them depends on something a cloud session
does not have:

- A marketplace declared under `extraKnownMarketplaces` in
  `.claude/settings.json`. The Claude Code documentation says a cloud session
  does not add it, because adding one needs the workspace trust dialog.
- A plugin directory under `.claude/skills/`, which Claude Code loads in place
  as a skills-directory plugin. The first version of this pull request used
  it. A cloud session skipped it: `claude plugin list` reported the directory
  "skipped because this workspace was not trusted when plugins were scanned",
  and a `git reset --hard` over tracked changes went through because the guard
  hook had not loaded.
- `CLAUDE_CODE_PLUGIN_DIRS` or `--plugin-dir`. Both load the plugin in a cloud
  session, measured on CLI 2.1.289. The variable needs an absolute path and
  CLI 2.1.280 or later, and setting it from the settings `env` block is too
  late. Neither can be committed to the repository.

What loads in a cloud session without trust is what `main` already used: a
skill directory under `.claude/skills/`, an agent file under `.claude/agents/`,
a command under `.claude/commands/`, and a hook declared in
`.claude/settings.json`. A headless `claude -p` in an untrusted directory loads
all of them when they are symlinks, measured on CLI 2.1.237.

## Decision

**Keep the harness as one plugin, `plugins/borso-harness/`, listed in a
marketplace at the repository root, and link each of its parts into the place
Claude Code reads it from.** Each skill directory, agent file and command file
gets a relative symlink in `.claude/`, and each plugin hook gets an entry in
`.claude/settings.json` that runs the script under
`$CLAUDE_PROJECT_DIR/plugins/borso-harness/hooks/`.
`plugins/borso-harness/scripts/link-into.sh` creates the links, prints the hook
entries, and with `--check` fails when either is out of step with the plugin;
`scripts/check-harness-links.sh` runs that check in pre-commit and CI. Talos
runs the same script with the prefix `vendor/borso.fr/plugins/borso-harness`.

The plugin still installs as a plugin, from the marketplace, for a local
session in a repository that does not vendor borso.fr. Paths the harness reads
in a consumer come from the consumer's `.claude/borso-harness.json`, and
borso.fr's layout is the default.

## Consequences

- `+` One copy of every skill, agent, command and guard hook, which borso.fr
  and Talos both load, in local and cloud sessions alike.
- `+` A branch that edits the harness loads its own edit, because the links
  point into the working tree.
- `-` The skills name their own files as `${CLAUDE_PLUGIN_ROOT}/…`, which
  Claude Code fills in only for a plugin. When the harness is linked, a
  SessionStart hook exports the variable to the shell, and each skill says how
  to find the folder if it still reads unexpanded. That is a convention the
  skills carry, not something Claude Code guarantees.
- `-` A new skill or hook in the plugin needs its link or its settings entry
  in every consumer. The check catches it in borso.fr; a consumer has to run
  the same check.
- `~` Agents are dispatched by their bare names, such as
  `technical-validator`. A session that installed the harness as a plugin
  lists them as `borso-harness:technical-validator`.
- `~` The blueprint generators stay in `.claude/skills/blueprint/`. They index
  borso.fr's own layers and are not part of the plugin, so that one skill gets
  its `SKILL.md` linked rather than its whole directory.

## Alternatives considered

### Option A: plugin linked into .claude/ part by part (chosen)

- **Summary:** as described in the decision.
- **Strengths:**
  - Loads without the trust dialog, so it works in cloud sessions.
  - Keeps a single copy, checked by a gate.
- **Costs:**
  - One link per part and one settings entry per hook, kept in step by a
    script.
- **Rationale:** the only option that loads in a cloud session from files the
  repository commits.

### Option B: skills-directory plugin through one symlink (rejected)

- **Summary:** `.claude/skills/borso-harness` links to the plugin.
- **Strengths:** one link, and the plugin loads as a unit.
- **Costs:** a cloud session skips it as untrusted.
- **Rejection rationale:** measured to fail in a cloud session on this pull
  request, with the guard hooks missing.

### Option C: marketplace in .claude/settings.json (rejected)

- **Summary:** declare the `borso` marketplace and enable `borso-harness@borso`.
- **Strengths:** the documented way to share a plugin through a repository.
- **Costs:** a cloud session does not add the marketplace, and a marketplace
  fetched from GitHub loads `main`, so a branch cannot test its own edit.
- **Rejection rationale:** fails in cloud sessions. It stays documented for
  local installs.

### Option D: CLAUDE_CODE_PLUGIN_DIRS in the cloud environment (rejected)

- **Summary:** set the variable to the plugin's absolute path in each cloud
  environment.
- **Strengths:** loads the plugin as a unit, with its scoped names.
- **Costs:** lives in each environment's configuration rather than in the
  repository, needs an absolute path that depends on where the session clones,
  and needs CLI 2.1.280 or later.
- **Rejection rationale:** nothing in the repository can check it, and a
  missing variable fails silently.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Loads in cloud sessions | high | Most work on both repositories runs there |
| Lives in the repository | high | A setting outside the repository cannot be checked |
| One source of truth | high | A second copy drifts, and the loop fixes one copy |
| A branch tests its own edit | medium | The kaizen loop edits the harness on branches |

|             | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| Loads in cloud sessions | ✓ plain project files | ✗ skipped as untrusted | ✗ marketplace not added | ✓ measured |
| Lives in the repository | ✓ | ✓ | ✓ | ✗ environment setting |
| One source of truth | ✓ links, checked | ✓ | ✓ | ✓ |
| A branch tests its own edit | ✓ | ✓ | ✗ loads `main` | ✓ |

## Implementation pointers

- Files: `plugins/borso-harness/scripts/link-into.sh`,
  `scripts/check-harness-links.sh`, `.claude/settings.json`,
  `plugins/borso-harness/hooks/session-env.sh`,
  `plugins/borso-harness/scripts/harness-path.sh`
- Install guide: [`plugins/borso-harness/README.md`](../../plugins/borso-harness/README.md)
- Related ADRs: ADR-0005, whose command contract moved into the plugin.
