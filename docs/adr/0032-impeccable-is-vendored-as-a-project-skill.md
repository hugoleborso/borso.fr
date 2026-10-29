# ADR-0032: impeccable is vendored as a project skill, without its edit hook

- **Status:** accepted
- **Date:** 2026-10-12
- **Deciders:** Hugo Borsoni
- **Tags:** meta, design, skills

## Context

The redesign of talos in pull request #171 was explored with impeccable, a third-party design skill by Paul Bakaus. It asks for the product's facts before any visual choice, deals competing directions so a run does not land on the usual look, and ships a detector that checks the result. It was installed by hand into `~/.claude/skills/` for that one session, and a hosted container loses everything under `~` when it is reclaimed. The operator asked to keep it in the repository.

The skill is not Markdown only. It carries 46 reference documents, a 535 KB browser script, a launcher that downloads a compiled engine on first use, and four agents it spawns. Upstream installs it with `npx impeccable install`, which also writes an edit hook into `.claude/settings.local.json`. Three rules of this repository bear on it: a new dependency is an ADR trigger; the harness under `plugins/borso-harness/` is Markdown only and is our own; and a cloud session skips both a declared marketplace and a plugin shipped under `.claude/skills/` as untrusted ([ADR-0026](./0026-the-harness-ships-as-a-plugin-linked-into-claude.md)), while a plain skill folder there loads.

## Decision

**Vendor the upstream skill folder verbatim into `.claude/skills/impeccable/` and its agents into `.claude/agents/`, pinned to one upstream commit, and leave out the edit hook.** A plain folder is what a cloud session loads, a verbatim copy keeps an update to a file copy as `plain-writing` already does, and the hook is left out because it would run the detector and download the engine on every UI edit in every session, for every application, whether or not the work is design work.

## Consequences

- `+` Every session, local or hosted, has `/impeccable` without an install step.
- `+` The version is pinned and reviewable in the tree; an update is one reviewed diff.
- `-` About 2.3 MB of third-party files sit in the tree and in every clone.
- `-` The detector only runs when someone runs it. A UI change finished without `impeccable detect` ships whatever the hook would have caught.
- `-` The launcher still downloads its engine binary from upstream on first use in each container, so a session's first impeccable command needs the network and trusts that download.
- `~` Prettier skips the vendored files, and `.impeccable/` session folders are gitignored.

## Alternatives considered

### Option A — Vendor the skill folder, no hook (chosen)

- **Summary:** Copy `plugin/skills/impeccable/` and `plugin/agents/` from upstream at a pinned commit, add `LICENSE`, `NOTICE.md` and a `PROVENANCE.md`, and do not install the hook.
- **Strengths:**
  - Loads in a cloud session, which skips plugins under `.claude/skills/`.
  - Pinned: nothing changes until someone copies a new version in.
- **Costs:**
  - 2.3 MB in the tree.
  - The detector is a manual step.
- **Rationale:** It is the only option that is available in every session and changes nothing until someone decides to update it.

### Option B — Install through the plugin marketplace (rejected)

- **Summary:** Declare `pbakaus/impeccable` as a marketplace and enable the plugin in `.claude/settings.json`.
- **Strengths:**
  - Nothing vendored; upstream updates arrive on their own.
- **Costs:**
  - ADR-0026 recorded that a cloud session skips a declared marketplace as untrusted.
  - Unpinned: a new upstream version changes behaviour with no diff to review.
- **Rejection rationale:** Loses on availability in hosted sessions, where most of this repository's work happens, and on pinning. If hosted sessions started loading marketplace plugins, it would still lose on pinning.

### Option C — Install at session start (rejected)

- **Summary:** Have `scripts/install-repo-deps.sh` run `npx impeccable install --providers=claude --scope=project` on every session start.
- **Strengths:**
  - Nothing vendored.
- **Costs:**
  - A network fetch and an npm package run on every session start, design work or not.
  - The upstream installer writes the edit hook unless told otherwise, and an unpinned `npx` fetch can change what it writes.
- **Rejection rationale:** Pays the cost on every session, and loses on pinning.

### Option D — Do not keep it (rejected)

- **Summary:** Leave the repository as it was. The skill is installed by hand into a session when someone wants a design pass, as was done for #171.
- **Strengths:**
  - No third-party files, no new trust in an upstream download.
  - The repository's own skills and the artifact design guidance still cover a modest UI change.
- **Costs:**
  - Every design session starts with a clone and a copy, and a hosted session forgets it at the end.
  - `apps/talos/PRODUCT.md` and `DESIGN.md` are written in the skill's format and would have no reader.
- **Rejection rationale:** The operator asked to keep it, and #171 showed the exploration it runs is the part worth keeping.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Available in a hosted session | high | Most work here runs on claude.ai/code, where `~` does not survive |
| Pinned and reviewable | high | A skill changes how agents behave; a change should arrive as a diff |
| Cost on sessions that do no design work | medium | Most sessions touch no UI |
| Tree size | low | 2.3 MB against a repository that already commits screenshots |

|  | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| Available in a hosted session | ✓ plain folder loads | ✗ a declared marketplace is skipped (ADR-0026) | ✓ installed at start | ✗ by hand each time |
| Pinned and reviewable | ✓ commit in PROVENANCE.md | ✗ follows upstream | ✗ unpinned `npx` | ✓ nothing to pin |
| Cost on non-design sessions | ✓ none, no hook | ✓ none | ✗ fetch every start | ✓ none |
| Tree size | ✗ 2.3 MB | ✓ none | ✓ none | ✓ none |

## Implementation pointers

- Files: `.claude/skills/impeccable/PROVENANCE.md`, `.claude/agents/impeccable-*.md`, `.prettierignore`, `.gitignore`
- First use: `apps/talos/PRODUCT.md`, `apps/talos/DESIGN.md`, pull request #171
- Related ADRs: [ADR-0026](./0026-the-harness-ships-as-a-plugin-linked-into-claude.md) (why a plugin under `.claude/skills/` is not an option in a cloud session)
