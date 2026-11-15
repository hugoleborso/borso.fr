# Invariants of borso-fr, in `./`

The rules the terms of [the vocabulary](./VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borso-fr/`.

## Entry point

- `site/index.html` loads `site/src/main.tsx`, which mounts the galaxy,
  and `site/src/home-page.ts`, which reads `fr.json` directly rather than
  carrying the i18next runtime onto the landing page.
- `site/art/mondrian/index.html` and `site/12-travaux/index.html` are the
  React pages; `site/family/` holds the two static ones.
- The burger menu links them. Its items live under `home.menu`, and their
  fan-out delay and Escape behaviour are decided in `home-menu.core.ts`.
