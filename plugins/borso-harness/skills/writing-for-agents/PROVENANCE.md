# Provenance

`SKILL.md` and `SKILL-MECHANICS.md` are verbatim copies of Matt Pocock's
`writing-for-agents` skill, published at
https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-for-agents
under the MIT licence. The licence text is in `LICENSE` beside them.

Both files stay unchanged, so a later upstream update is a file copy rather
than a merge. Anything specific to this repository goes in the present file.

## Which skill applies to which document

`writing-for-agents` governs documents an agent consumes, which here means
every `SKILL.md` under `.claude/skills/`, `CLAUDE.md`, and anything under
`docs/standards/` that an agent reads while writing code.

[`plain-writing`](../plain-writing/SKILL.md) governs prose a person reads,
which means commit bodies, pull request descriptions, the dantotsus, and the
architecture decision records.

The two agree on pruning and on single sources of truth. They disagree on
sentence shape, because `plain-writing` asks for longer explanatory sentences
and `writing-for-agents` asks for the fewest tokens that change behaviour.
When a document has both audiences, follow `writing-for-agents` for the
instruction lines and `plain-writing` for the surrounding explanation.

## This repository's constraint on skills

CLAUDE.md keeps skills markdown only, with no `package.json` and no test
runner. `SKILL-MECHANICS.md` describes frontmatter and invocation choice, and
it does not conflict with that constraint.
