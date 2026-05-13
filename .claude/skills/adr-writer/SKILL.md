---
name: adr-writer
description: |
  Write an Architecture Decision Record under `docs/adr/NNNN-<slug>.md`.
  Use when `/tech-lead-orchestrator` detects an architectural decision that
  meets one of the four ADR triggers (multiple serious alternatives,
  cross-cutting impact, divergence from a convention, looks-standard-or-
  exists-elsewhere). Also usable directly: "/adr-writer <decision title>",
  "write an ADR for X". The skill picks the next sequential number, drafts
  the ADR from the template, runs `findConflictingAdrs` against existing
  accepted ADRs sharing the same slug, and either ships the file or
  escalates the conflict to the human. Reads the standard at
  `.claude/skills/adr-writer/standard.md` before writing.
---

# adr-writer skill

The skill writes one ADR per invocation. ADRs live at
[`docs/adr/NNNN-<slug>.md`](../../../docs/adr/). Format and rules live in
[`standard.md`](./standard.md); the squelette in [`template.md`](./template.md).
Pure helpers (number picking, rendering, conflict detection) live in
[`src/`](./src/) and ship at 100 % coverage via the workspace's `test:coverage`
script.

## When to invoke

Invoke when **any** of the four triggers applies — the same OR-list the
tech-lead-orchestrator uses (see `docs/features/meta/tech-lead-orchestrator/
spec/spec.md` Q.O.D. row "Quand écrire un ADR ?"):

1. **Multiple serious alternatives** considered for a single choice — record
   what was picked, what wasn't, why.
2. **Cross-cutting impact** — the decision spans ≥ 2 apps, ≥ 2 modules, or
   leaks into infra and code.
3. **Divergence from a convention** — the decision contradicts a CLAUDE.md
   rule, an existing ADR, or a `docs/knowledge/` entry. The ADR justifies
   the divergence; the convention either changes or the ADR notes it's a
   one-off.
4. **Looks-standard-or-exists-elsewhere** — the decision is something the
   industry has settled on or another repo already solved. The ADR records
   "we reuse pattern X from Y" *or* "we reinvent because Z" — both are
   valid, silence is not.

Do **not** invoke when:
- The choice is a coding-style call already covered by Biome / CLAUDE.md
  *Clean code* (these go in the linter, not in an ADR).
- The choice is reversible in < 1 commit with no migration (just do it,
  ADR overhead doesn't pay).
- An accepted ADR with the same slug already exists — invoke once with
  `supersedes: [NNNN]` to declare the override, otherwise
  `findConflictingAdrs` will flag the conflict and the tech lead escalates
  to the human.

## Procedure

1. **Read** the latest version of `standard.md` and `template.md`.
2. **List** existing ADRs: `ls docs/adr/` (or read `docs/adr/README.md`).
3. **Pick the number** via `nextAdrNumber(filenames)` from
   `src/adr-number.utils.ts`. The first ADR is `0001`.
4. **Check conflicts** via `findConflictingAdrs({ slug, supersedes }, existing)`.
   If the function returns a non-empty list:
   - If the new ADR was meant to replace them, add their numbers to
     `supersedes` and continue.
   - Otherwise, emit a `SubAgentVerdict` with
     `status: 'blocked'`, `next: { kind: 'escalate', reason: 'adr-conflict' }`
     and stop. The tech lead escalates to the human.
5. **Fill the template** — Context (the situation that forced the choice,
   not a generic intro), Decision (the chosen path, in one paragraph
   maximum + a single bullet list if needed), Consequences (what becomes
   easier, what becomes harder, what now needs to be remembered).
6. **Render and write** the file at
   `docs/adr/NNNN-<slug>.md` via `renderAdrMarkdown(adr)` +
   `renderAdrFilename(adr)`.
7. **Update the index** `docs/adr/README.md` with a one-line entry.
8. **Mark superseded** — if `supersedes` is non-empty, edit each predecessor's
   front-matter / header to set `status: superseded` and add
   `**Superseded by:** NNNN`.
9. **Emit verdict** — write the contract YAML to the tech lead's
   `runs/<run-id>/agents/adr-writer-<step>.md` file (see the
   tech-lead-orchestrator's `sub-agent-contract.md`).

## Composability

`/adr-writer` is a sub-skill called by `/tech-lead-orchestrator`. It is also
invokable directly by the human ("/adr-writer cache-invalidation-strategy")
when an ADR is needed outside a feature-orchestration run.

## Failure modes to avoid

- **Writing an ADR for a coding-style choice.** Those belong in Biome or
  CLAUDE.md *Clean code*, not in `docs/adr/`.
- **Skipping the conflict check.** Two accepted ADRs with the same slug
  silently coexisting is a worse failure than blocking on a conflict.
- **Re-using a number.** Always call `nextAdrNumber()` against a fresh
  filesystem listing — never hard-code.
- **Writing prose instead of decisions.** The Context section is the
  *forcing function*, not a recap of the feature. If you find yourself
  paraphrasing the spec, you don't need an ADR — you need a link.
