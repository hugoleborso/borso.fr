# Invariants of borso-fr, in `site/src/labours`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borso-fr/`.

## Challenge

- `titleKey`, `kind` and `status` are required; `noteKey` and `proofs`
  are optional. Every reader-facing string is a `TranslationKey`.
- `kind` is one of `daily`, `count`, `oneshot`. `status` is one of
  `done`, `partial`, `failed`, `abandoned`, `doing`, `todo`; only the
  first two weigh in a score.

## Edition

- `titleKey`, `subtitleKey` and `months` are all required.
- `LABOURS.editions` is keyed by year, and `listAvailableYears` relies on
  numeric-looking keys enumerating in ascending order. Two ship,
  `EDITION_2025` and `EDITION_2026`, each in its own file.

## Month

- `monthNumber`, `nameKey` and `challenges` are required; `coverImage` is
  optional. A month with no explicit cover lends its first photo proof,
  and only when it has at least two (`listMonthCoverImages`).
- `selectCurrentMonthNumber` answers null unless the edition on screen is
  the current year, which is what marks a month as live.

## Proof

- `type` is one of `photo`, `video`, `link`, `note`, `stat`, and `value`
  carries a media path, an address or a measured figure depending on it.
- `listProofSections` splits a challenge's proofs into a media carousel
  (`photo` and `video`) and a row of chips, dropping either when empty.
- Media files live under `site/public/media/12-travaux/`, referenced
  absolutely so they stay clear of the `/12-travaux/` route.

## Score

- `completed` and `total`, where `total` is the challenge count. A `done`
  challenge is worth 1 and a `partial` one 0.5, so `completed` may carry
  a half.
- `formatScore` writes it in the `fr-FR` locale, so a half point reads
  with a comma and matches the distances written on the same page.
