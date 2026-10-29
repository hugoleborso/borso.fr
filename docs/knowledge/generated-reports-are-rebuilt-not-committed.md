---
summary: 'A generated report is an output, so it is gitignored and rebuilt by `scripts/reports.sh` before anything reads it; only inputs a person accepted are committed.'
triggers:
  paths:
    - '.gitignore'
    - 'docs/standards/enforcement-ledger.md'
    - '.claude/skills/blueprint/blueprint-index.md'
    - '.claude/skills/blueprint/blueprint-coverage.html'
  commands:
    - 'scripts/reports\.sh'
---

# Generated reports are rebuilt, not committed

A file is committed when it is an input and ignored when it is an output.
[ADR-0014](../adr/0014-generated-files-are-not-committed.md) records the
decision and its measurements.

An input is something a person wrote or accepted that no command can recompute.
The committed inputs are `docs/standards/convention-baseline.json` (a count
accepted with `--accept`), `docs/standards/blueprint-subjects.json` (the symbol
each `@FollowsBlueprint` marker was accepted against) and the CloudFormation
template snapshots, whose diff is the review artefact. Everything else a
generator writes is listed in `.gitignore`.

## What follows from it

- **Rebuild before you read.** Run `scripts/reports.sh` with the group you need
  (`blueprints`, `standards`, `maps` or `all`). A subagent in its own worktree
  starts from a checkout where SessionStart never ran, and a blueprint added
  this session is missing from the index until it is rebuilt. A new skill that
  reads one of these files names the command.
- **`--check` validates, it does not compare.** There is no committed copy to
  compare with. A check mode refuses what a person can get wrong, such as an
  annotation naming no blueprint or a `@DependsOnExternal` no manifest declares.
- **Link to the published copy when the link must survive.** A link to a
  generated file resolves on a checkout and 404s on github.com. `pages.yml`
  publishes the outputs on each push to `main`. The architecture maps are the
  exception: they build only when someone dispatches
  `.github/workflows/architecture.yml`.
- **A merge conflict in a generated file carries no information.** Resolve it by
  running the generator again.
