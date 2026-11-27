---
date: 2026-05-03
introduced-at: implementation
detected-at: staging
severity: high
related-pr: '#6'
fix-commits: [88b1178cf]
eradication-level: 2
eradication-paths: [scripts/check-non-module-scripts.sh, .husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: hours
tags: [vite, ci, frontend]
zone: apps/borso-fr/site/index.html
---

# Vite quietly leaves non-module `<script src>` tags un-bundled

## User impact

The borso.fr preview deploy of PR #6 loaded the home page without its
JavaScript. The operator found it on the preview URL.

| | Seen | Expected |
| --- | --- | --- |
| Home page, preview deploy | No nav-icon listener, no gradient canvas. DevTools: `GET /script.js → 404` | The menu opens and the gradient draws, as in `pnpm dev` |

Every visitor of the home page would have seen it in production (inferred). The mondrian
and family pages worked.

## Causal chain

- `/script.js` returned 404 on the preview.
  - The file was not in `dist/`, and `dist/index.html` still pointed at it.
    - Vite's build bundled only the module scripts. The home page carried a
      classic tag, which Vite passes through as literal text and does not copy:

      ```html
      <!-- apps/borso-fr/site/index.html: no type="module", so Vite leaves it alone -->
      <script src="script.js"></script>
      ```

      - Commit `ac49ae999` ("feat(borso-fr): port Mondrian Atelier to
        /art/mondrian", 2026-05-03, an agent) moved the app "from cp -R to a
        Vite multi-page project". It added `site/index.html` to
        `rollupOptions.input` in `apps/borso-fr/vite.config.ts`. It rewrote the
        mondrian page it was porting and left the home page's tag as it was.
        - Before that commit, `pnpm build` was `cp -R site dist`, so the
          classic tag worked.
          - The tag dates from `c22cca220` ("refactor: split into files",
            2025-02-09), for a plain static site with no build.
            `5744b7a53` moved it unchanged into `apps/borso-fr/site/`.

## Root cause of occurrence

*Thought adding a page to Vite's build inputs brings its scripts along.
Actually Vite rewrites and bundles only `<script type="module">`. A classic
`<script src>` stays literal text in the output, and the file it names is not
copied.* (Material, inferred.)

The writer of the tag never had Vite in mind. The writer of `ac49ae999` did:
it built the Vite config. Its task was the mondrian port, and the home page
came along as a side effect of the move to one build graph. Nothing in the
repository described what Vite does with an HTML page it did not write. Vite
itself does warn. Vite 6's HTML plugin logs `<script src="…"> in "…" can't be
bundled without type="module" attribute` (read in
`node_modules/.pnpm/vite@6.4.5_*/node_modules/vite/dist/node/chunks/dep-CkSfqg8D.js:36661`).
Whether the agent ran `vite build` and saw that line is unknown. If it did, the
cause is Man, and the gate below answers it the same way.

Below it sits Method. The migration changed who owns every HTML reference, and
nothing in it checked that each reference still resolved in `dist/`.

## Detection failure causes

- **Build:** Vite prints a warning and exits 0. A warning that does not fail
  the build is not detection.
- **Local:** `pnpm dev` serves `site/` directly, so `/script.js` resolved. The
  manual sweep ran on dev, not on `pnpm preview`.
- **Linter:** Biome did not lint HTML, and knip reads JS imports, not HTML
  references.
- **Review:** the defect was not in the diff. The diff added the page to the
  build inputs, and the tag sat unchanged in a file the commit never touched.
- **Visual validation:** the spec covered the mondrian page, so the validator
  never opened the home page.
- **Monitoring:** a 404 on a static asset raises no alert.

## Countermeasure

Commit `7c62539` adds `type="module"` to the tag,
`<script type="module" src="./script.js"></script>`. Vite then bundles it into
`dist/assets/index-<hash>.js` and rewrites the reference.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `88b1178cf` ("docs: lessons from PR #6") added
`scripts/check-non-module-scripts.sh`. It fails when any
`apps/*/site/**/*.html` holds a `<script src>` without `type="module"`.
`.husky/pre-commit:358` runs it on staged HTML, and `.github/workflows/ci.yml:159`
runs it on every pull request. This entry first said pre-push.

```bash
matches=$(/usr/bin/grep -rEn '<script[^>]+src=' apps/*/site \
  --include='*.html' 2>/dev/null \
  | /usr/bin/grep -v 'type="module"' \
  || true)
```

**Proof it can fail:** not recorded. The check exits 1 on any match, by
reading of the script.

The check holds only for this tag shape. It misses a `<link href>`, an
`<img src>` or a reference split across lines. It would also refuse a
legitimate classic script, such as one served from `public/`, which Vite
skips on purpose.

**Proposed:** replace the grep with a post-build check in CI. For each
`apps/*/dist/**/*.html`, every local `src` and `href` must resolve to a file in
that `dist/`. Delete `scripts/check-non-module-scripts.sh` and its two call
sites in the same change. A page whose output points at a file the build did
not emit would then fail CI, whatever the tag, and whether it came from a
migration or not.

**Similar instances:** `grep -rEn '<script[^>]+src=' apps/*/site --include='*.html' | grep -v 'type="module"'`
finds none today, since the gate passes on main.
