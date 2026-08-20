# Claude Code's built-in output styles live in the binary, not in the docs

An output style changes how Claude Code writes, not what it knows: it is
appended to the system prompt at session start. The setting is one field, and
its value is the style's name:

```json
{
  "outputStyle": "Concise"
}
```

This repository sets it in `.claude/settings.json`, which is committed, rather
than in `.claude/settings.local.json`, which is where the `/config` picker
writes and which no hosted session on claude.ai/code ever sees.

## The names are only knowable from the installed version

On 2026-08-20 the published page at `code.claude.com/docs/en/output-styles`
listed three built-in styles beside the default — Proactive, Explanatory,
Learning — and the installed CLI carried four. `Concise` was real, worked, and
appeared nowhere in the documentation. The docs page was right about the
*mechanism* (the key is `outputStyle`, the value is the name) and behind on the
*inventory*, which is the usual split: mechanism changes rarely, inventory
changes with every release.

So read the inventory out of the thing that resolves it:

```bash
claude --version
grep -aoE '"(Concise|Explanatory|Learning|Proactive)"' "$(readlink -f "$(which claude)")" | sort -u
```

For the full record of one style — its description and whether it keeps the
coding instructions — find the offset and read around it:

```bash
binary=$(readlink -f "$(which claude)")
offset=$(grep -aob '"Concise"' "$binary" | head -1 | cut -d: -f1)
dd if="$binary" bs=1 skip=$((offset - 400)) count=1200 2>/dev/null | tr -d '\0'
```

which on 2.1.237 returns:

```
Concise:{name:"Concise",source:"built-in",description:"Claude responds tersely,
leading with results and skipping preamble and narration",keepCodingInstructions:!0,…}
```

`keepCodingInstructions: true` is the field that matters when choosing one: the
style replaces the voice and keeps the software-engineering instructions. A
custom style leaves them out unless its frontmatter says
`keep-coding-instructions: true`.

## Two properties that surprise people

- **It is read once, at session start.** Setting it does not change the session
  that set it; `/clear` or a new session does. A change that "did nothing" has
  almost always just not been reloaded.
- **It applies to the main conversation only.** A subagent runs its own system
  prompt, so validation agents and workflow rounds keep whatever verbosity
  their own standard gives them. A fork is the exception — it inherits the
  parent's full prompt.

## See also

- [`../dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](../dantotsus/believed-the-bundle-readme-not-the-live-package-json.md) — the same shape: published text describing an artefact, and the artefact disagreeing.
