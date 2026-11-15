# Invariants — last-loop-lepin, `api/src/runner`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/last-loop-lepin/`.

## Bib

- The API requires a bib when a runner is created: a positive integer up to
  9999.
- The `bib` column itself is nullable, and `Runner.bib` is `number | null`.
- `validateRunnerDraft` rejects a bib another runner of the edition already
  holds, with reason `bib-already-taken`.

## Runner

- A runner belongs to exactly one edition: `runners` has a composite primary
  key on `(edition_slug, slug)`, and `createRunner` refuses a slug the edition
  already carries.
- `edition_slug`, `slug` and `display_name` are not null. `photo_key` and
  `bib` are nullable.
- `slugifyDisplayName` builds the default slug: lower case, accents stripped,
  runs of other characters folded to a dash, edge dashes trimmed, cut to 64
  characters.
- `validateRunnerDraft` rejects a slug with a leading or trailing dash, which
  the slug pattern on its own accepts.
- The shape the front receives adds `photoUrl`, composed from `photoKey` and
  the photos CDN host. It is null when either of the two is missing.
