---
status: open
found-in: '#350'
right: 'write access to hugoleborso/talos, which this repository''s sessions cannot attach'
---

# The Talos delegation procedure restates borso.fr's rules

The Talos session that started PR #350 read
`.claude/skills/construire-outil/BORSO-FR.md` in `hugoleborso/talos`, then
wrote the borso.fr session's prompt. That prompt said « Écris tout en
français », asked for the ADR « numérotation », and offered to create
`docs/adr/` in MADR format if none existed (measured, `list_events` on the
Talos session, 2026-11-15 06:33 UTC). All three contradict this repository:
CLAUDE.md requires English, ADRs are named by UTC minute, and `docs/adr/`
holds its own template. The borso.fr session followed the prompt, and its
first commit credited the French to the operator.

Whether the procedure file holds these lines or the Talos session improvised
them is unknown: the sweep of PR #350 was refused access to that repository.

`scripts/check-docs-are-english.sh` now refuses a French ADR, spec or plan at
commit, whatever a prompt says. The procedure is the second copy of the rules,
and removing that copy is the change this task asks for.

## The task

In `hugoleborso/talos`, make the borso.fr delegation procedure pass the
operator's need, its context and the done condition, and nothing about how
borso.fr writes its documents. Let it say that borso.fr's `CLAUDE.md` decides
language, naming and format, and that a prompt written in French is translated
before it reaches the repository.

## Done when

`grep -niE 'français|french|numérot|MADR' .claude/skills/construire-outil/BORSO-FR.md`
in `hugoleborso/talos` prints no line that tells the borso.fr session how to
write.
