# ADR standard

> The format below is the *whole* contract. Anything more (extended
> context, comparison tables, links to research) goes inline in the
> Context / Decision / Consequences sections — not in new top-level
> sections.

## File location and naming

- Path: `docs/adr/NNNN-<slug>.md`.
- `NNNN` is a 4-digit zero-padded sequential number, picked by scanning
  the existing `docs/adr/` listing and adding 1 to the highest number
  found (or `0001` if the directory is empty).
- `<slug>` is kebab-case, ≤ 6 words, describes the **decision**, not the
  feature. `0007-tenant-isolation-per-database.md`, not
  `0007-multi-tenancy-feature.md`.

## Required fields

| Field | Source of truth | Notes |
|---|---|---|
| `number` | Filename | Padded to 4 digits in the rendered header. |
| `slug` | Filename | Drives conflict detection (same slug = same subject). |
| `title` | First line of the file | One sentence, no period. |
| `status` | Header field | `proposed` (rare; we tend to ship decisions, not propose them) / `accepted` / `superseded`. |
| `date` | Header field | ISO date of the decision. Today, in `YYYY-MM-DD`. |
| `context` | Section | Why we had to decide. The forcing function, not a feature recap. ≤ 200 words. |
| `decision` | Section | What we chose. One paragraph + optionally one bullet list. ≤ 150 words. |
| `consequences` | Section | What becomes easier, harder, or now needs remembering. ≤ 150 words. |
| `supersedes` | Optional header | `[NNNN, ...]` of ADRs explicitly replaced. The replaced ADRs must also be edited to set `status: superseded`. |
| `supersededBy` | Optional header | Set on a superseded ADR pointing forward. |

## Rendering

The rendered ADR follows the layout in [`template.md`](./template.md):
a level-1 heading with the padded number + title, the `**Status:**` and
`**Date:**` header lines, optional `**Supersedes:**` / `**Superseded
by:**`, and then the Context / Decision / Consequences sections.
Re-render the header lines from the canonical metadata; don't hand-edit
them piecewise once the file is on disk.

## Conflict rules

- Two accepted ADRs **must not** share a slug. The conflict check in the
  skill's procedure step 4 is the gate.
- An ADR that overrides a previous one must list every overridden number
  in `supersedes`. Silently making the predecessor wrong is a defect.
- A superseded ADR stays in the tree (history matters); only its status
  flips and `supersededBy` is set.

## Examples of what NOT to write

- "Use TypeScript across the codebase." — already a project-wide
  convention in CLAUDE.md. Not an ADR.
- "Add a button to the homepage." — feature work, lives in `spec.md` /
  `plan.md`. Not an ADR.
- "Refactor the StaticSite construct." — implementation detail, lives in
  the PR diff. Unless the *interface* changes in a way that affects
  callers, not an ADR.

## When the ADR feels too small to write

If the Context section is shorter than three sentences and the
Consequences section reads as "nothing changes", you probably don't need
an ADR — you need a `docs/knowledge/` entry, or a one-line comment in the
code. Bail out, write the cheaper artefact.
