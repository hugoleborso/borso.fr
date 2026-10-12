# Provenance

This folder is a verbatim copy of the impeccable design skill by Paul Bakaus, published at https://github.com/pbakaus/impeccable under the Apache License 2.0. The licence is in `LICENSE` and the upstream notices in `NOTICE.md`, both beside this file. The four agents the skill spawns are copied beside the others, as `.claude/agents/impeccable-*.md`.

- Upstream folder: `plugin/skills/impeccable/` and `plugin/agents/`
- Upstream commit: `c63b8dd7dd5a5f3c32eaabe1af76d0694f863ed2` (2026-10-11)
- Skill version: 4.5.2, engine version 0.1.14

We keep every file unchanged, so an update is a file copy and not a merge. Anything about how the skill applies to this repository goes in this file. The decision to vendor it, and what was left out, is [ADR-0032](../../../docs/adr/0032-impeccable-is-vendored-as-a-project-skill.md).

## Updating

```sh
git clone --depth 1 https://github.com/pbakaus/impeccable /tmp/impeccable
rm -rf .claude/skills/impeccable.new
cp -r /tmp/impeccable/plugin/skills/impeccable .claude/skills/impeccable.new
cp /tmp/impeccable/LICENSE /tmp/impeccable/NOTICE.md .claude/skills/impeccable.new/
cp .claude/skills/impeccable/PROVENANCE.md .claude/skills/impeccable.new/
rm -rf .claude/skills/impeccable && mv .claude/skills/impeccable.new .claude/skills/impeccable
cp /tmp/impeccable/plugin/agents/*.md .claude/agents/
```

Then update the commit and the versions above.

## How the skill applies here

- Each application that is designed with it carries its own `PRODUCT.md` and `DESIGN.md` beside its `package.json`, as `apps/talos/` does. The skill finds them from the `--target` path.
- Where a reference says `npx impeccable <verb>`, run `.claude/skills/impeccable/scripts/impeccable <verb>`: the npm package is not installed here, and the launcher is the same engine.
- The edit hook that upstream's installer writes into the machine-local Claude Code settings is not installed. Run `scripts/impeccable detect --json <files>` by hand once a UI change is finished.
- Its session files under `.impeccable/questions/`, `.impeccable/review/` and `.impeccable/mocks/` are gitignored.
- The launcher downloads its engine binary into `~/.impeccable/bin/` on first use. A hosted container starts without it, so the first command of a session fetches it.
- Mock-ups of `talos` use fictional content only, because talos has no preview stage and its real content is private.
