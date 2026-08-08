---
date: 2026-05-03
introduced-at: implementation
detected-at: staging
severity: high
related-pr: #6
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [7c62539]
eradication-level: 2
time-to-detect: hours
tags: [vite, ci, frontend]
---

# Vite quietly leaves non-module `<script src>` tags un-bundled

## Symptom

The borso.fr preview deploy (`https://borso-fr-pr-6.preview.borso.fr/`) loaded the document but the JavaScript was missing — no nav-icon listener, no gradient canvas. DevTools showed `GET /script.js → 404`. Every other entry page (mondrian, family) worked because they used `type="module"` script tags.

## Root-cause chain

1. **Why** did `/script.js` 404 in the preview deploy?
   The asset wasn't in `dist/`. Vite's build had not copied or bundled it.

2. **Why** wasn't it in `dist/`?
   The source HTML at `apps/borso-fr/site/index.html` referenced it as `<script src="script.js"></script>` (no `type="module"`). Vite's HTML pipeline treats that as a literal-text reference, not a build input.

3. **Why** does Vite treat non-module script tags as opaque?
   Vite documents that only `<script type="module">` is rewritten by the HTML plugin. Non-module scripts are left alone for back-compat with apps that hand-manage classic scripts (e.g. analytics, third-party SDK loaders that need to stay un-bundled).

4. **Why** did this slip past `pnpm build`?
   The build *succeeded* — Vite emits zero warnings for non-module script tags it deliberately doesn't process. The asset graph contained only the `type="module"` entries; the non-module reference passed through into `dist/index.html` unchanged.

5. **Why** did local `pnpm dev` work?
   The dev server proxies the `site/` directory directly. `script.js` lives there, dev requests `/script.js`, dev server serves `apps/borso-fr/site/script.js`. The build-time gap doesn't appear locally.

**Root cause:** *thought* Vite's HTML pipeline rewrites every `<script src>`; *actually* it rewrites `type="module"` only and silently passes the rest through, so the asset lands in `dist/` only when the developer remembers the `type="module"` keyword.

## Detection failure causes

- **Typing:** N/A — not a TS issue.
- **Linter / static analysis:** Biome doesn't lint HTML. Knip looks at JS imports, not HTML asset references. Vite emits no warning.
- **Functional validation locally:** Dev server worked, masking the build-time gap. The implementer's manual sweep was on dev, not on `pnpm preview` (production-build serve).
- **CI (tests / build):** `pnpm build` exits 0 because the build technically succeeds — there's just no asset in `dist/` and no rewritten reference. The build's success criteria don't include "every src referenced in HTML resolved".
- **Code review:** Diff was small (one line in an unfocused-area HTML file); reviewer didn't notice the missing `type="module"`.
- **PO / QA validation:** First detected on the production preview URL during an end-to-end check by the human. The visual-validator never visits the index page (out of spec scope).
- **Production monitoring / alerting:** None — static-site 404s for assets aren't surfaced.

## Countermeasure

Add `type="module"` to the script tag so Vite picks it up, bundles it into `dist/assets/index-<hash>.js`, and rewrites the HTML reference.

- **Code:** commit [`7c62539`](https://github.com/hugoleborso/borso.fr/commit/7c62539) — `<script type="module" src="./script.js"></script>` in `apps/borso-fr/site/index.html`.
- **Operator action:** None — once merged the next preview / prod build emits a working `dist/index.html`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-push hook)

**Reference:** PR (this kaizen) · commit `<kaizen-commit>`

**The actual fix:** add a pre-push grep guard that fails if any HTML in `apps/*/site/**` references a script without `type="module"`. The check is shell, not JS, so it costs nothing on every push.

```bash
# .husky/pre-push (excerpt — see scripts/check-non-module-scripts.sh)
scripts/check-non-module-scripts.sh
```

```bash
# scripts/check-non-module-scripts.sh
#!/usr/bin/env bash
set -euo pipefail
matches=$(/usr/bin/grep -rEn '<script[^>]+src=' apps/*/site \
  --include='*.html' \
  | /usr/bin/grep -v 'type="module"' || true)
if [ -n "$matches" ]; then
  printf '\033[31mFAIL\033[0m non-module <script src> tag — Vite will not bundle this; production will 404.\n'
  printf '%s\n' "$matches"
  printf 'Fix by adding type="module" to the tag.\n'
  exit 1
fi
```

A CI job running the same script on PR open is a sibling defence-in-depth, but the pre-push catches it locally before push, which is cheaper.

**Sibling defects swept:** none (this was the only non-module reference in the repo at the time of the dantotsu).

## See also

- [`docs/knowledge/biome-stack-overflow-on-dist-binaries.md`](../knowledge/biome-stack-overflow-on-dist-binaries.md) — another Vite-build / repo-tooling interaction, where Biome scanning the build output caused a different class of failure.
