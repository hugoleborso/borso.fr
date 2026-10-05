# ADR-0026: The harness ships as a plugin, loaded from the skills directory

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

Claude Code has one format for sharing such a set: a plugin. A plugin can reach
a repository in two ways. A marketplace declared in `.claude/settings.json`
under `extraKnownMarketplaces`, with the plugin under `enabledPlugins`, or a
plugin directory placed under `.claude/skills/`, which Claude Code loads in
place as a skills-directory plugin. The Claude Code documentation says a cloud
session does not add a marketplace that a repository declares, because adding
one needs the workspace trust dialog and a cloud session never shows it. Most
work on borso.fr runs in cloud sessions, and so do Talos's routines.

## Decision

**Ship the harness as the plugin `plugins/borso-harness/`, listed in a
marketplace at the repository root, and load it in borso.fr through the
symlink `.claude/skills/borso-harness`.** The symlink makes it a
skills-directory plugin: Claude Code reads it in place, so an edit to the
plugin takes effect at the next session, and no marketplace has to be
installed. A consumer that vendors borso.fr makes the same symlink into its
submodule. A consumer that does not can install the plugin from the
marketplace for local sessions. Paths the harness reads in the consumer come
from the consumer's `.claude/borso-harness.json`, and borso.fr's layout is the
default.

## Consequences

- `+` One copy of every skill, agent and guard hook, which borso.fr and Talos
  both load.
- `+` borso.fr needs no settings change to load the plugin, and an edit to the
  plugin needs no version bump or reinstall.
- `-` Agents get the plugin's prefix, so a dispatch names
  `borso-harness:technical-validator` rather than `technical-validator`.
  Skills keep their bare names while no other command uses the same name.
- `-` Whether a cloud session loads a skills-directory plugin is not stated in
  the documentation and is unverified from here. Locally, `claude plugin list`
  in a trusted checkout reports `borso-harness@skills-dir` loaded with its
  skills, agents and hooks. If a cloud session turns out not to load it, the
  skills and the guard hooks are missing there until the hooks move back into
  `.claude/settings.json`.
- `~` The blueprint generators stay in `.claude/skills/blueprint/`. They index
  borso.fr's own layers and are not part of the plugin; the plugin's
  `/blueprint` skill reads the index path from the consumer's configuration.

## Alternatives considered

### Option A: skills-directory plugin through a symlink (chosen)

- **Summary:** the plugin lives in `plugins/borso-harness/`, and each
  repository that uses it links `.claude/skills/borso-harness` to it.
- **Strengths:**
  - Needs no marketplace install, which cloud sessions do not perform.
  - Loads the working tree, so a branch that edits the plugin tests its own
    edit.
- **Costs:**
  - The cloud behaviour is unverified.
- **Rationale:** it is the only route that does not depend on a step the
  documentation says cloud sessions skip.

### Option B: marketplace in `.claude/settings.json` (rejected)

- **Summary:** borso.fr and Talos declare the `borso` marketplace under
  `extraKnownMarketplaces` and enable `borso-harness@borso`.
- **Strengths:** the documented way to share a plugin through a repository.
- **Costs:** a cloud session does not add the marketplace, so the harness
  would be missing in exactly the sessions that use it most. A marketplace
  fetched from GitHub also loads `main`, so a branch that edits the plugin
  would not test its own edit.
- **Rejection rationale:** fails the cloud criterion. It stays documented for
  local installs in a repository that does not vendor borso.fr.

### Option C: copy `.claude/` into each repository (rejected)

- **Summary:** Talos keeps its own copy of the skills and hooks.
- **Strengths:** no new mechanism.
- **Costs:** two copies that drift, and every kaizen fix applied twice.
- **Rejection rationale:** fails the single-source criterion.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Loads in cloud sessions | high | Most work on both repositories runs there |
| One source of truth | high | A second copy drifts, and the loop fixes one copy |
| A branch tests its own edit | medium | The kaizen loop edits the harness on branches |

|             | Option A | Option B | Option C |
|---|---|---|---|
| Loads in cloud sessions | ? unverified, no documented exclusion | ✗ documented as skipped | ✓ plain project files |
| One source of truth | ✓ | ✓ | ✗ |
| A branch tests its own edit | ✓ loads in place | ✗ loads the marketplace's ref | ✓ |

## Implementation pointers

- Files: `plugins/borso-harness/.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`, `.claude/skills/borso-harness`,
  `plugins/borso-harness/scripts/harness-path.sh`,
  `plugins/borso-harness/hooks/hooks.json`
- Install guide: [`plugins/borso-harness/README.md`](../../plugins/borso-harness/README.md)
- Related ADRs: ADR-0005, whose command contract moved into the plugin.
