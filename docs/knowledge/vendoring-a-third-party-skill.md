---
summary: 'A third-party skill copied verbatim trips four gates that read .claude/: scope each one to skip it, with the reason beside the exclusion, and keep the local notes in PROVENANCE.md.'
triggers:
  paths:
    - '.claude/skills/*/PROVENANCE.md'
    - 'plugins/borso-harness/skills/*/PROVENANCE.md'
---

# Vendoring a third-party skill

`plain-writing` and `impeccable` are copied from upstream unchanged, so an update stays a file copy ([ADR-0032](../adr/0032-impeccable-is-vendored-as-a-project-skill.md)). Anything about how the skill applies here goes in a `PROVENANCE.md` beside it, never in its own files.

Upstream files do not follow this repository's rules, and four gates read every file under `.claude/`. Vendoring impeccable on PR #174 failed the commit four times, one gate at a time:

| Gate | What it refused | Where the exclusion lives |
| --- | --- | --- |
| ESLint | comments and style rules in the skill's browser scripts | `VENDORED_THIRD_PARTY_FILES` in `eslint.config.js` |
| Prettier | formatting of the same scripts | `.prettierignore` |
| `scripts/check-instructions-name-installed-tools.sh` | `npx impeccable`, which here is the skill's own launcher | the `INSTRUCTION_SURFACES` pathspec |
| `scripts/check-named-paths-exist.sh` | paths of a project that installs the skill's hook | the `git ls-files` pathspec |

Scope all four in the same commit, with the reason written beside each exclusion, and add to `PROVENANCE.md` the command to run where the upstream text names one that does not exist here.

A vendored skill's agents go in `.claude/agents/` beside the harness's links, as plain files.
