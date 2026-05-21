---
status: done
summary: |
  Bug 1 — picked Option B (hash-wasm) over the banner-only fix because
  even with __dirname defined argon2 still needs its .node binding
  shipped alongside the bundle, which is more infra surface than a
  pure-WASM swap justifies. hash-wasm's argon2id produces the same
  $argon2id$v=19$… encoded format, so existing app_config rows
  verify without re-bootstrap. Parameters match the native default
  (memorySize=65536 KiB, iterations=3, parallelism=4, hashLength=32).
  Whichever path was chosen, the LambdaApi banner needed
  __dirname/__filename anyway for any future native module — lifted
  into a shared ESM_CJS_INTEROP_BANNER constant consumed by both
  LambdaApi and DsqlSchema, gated by a sibling test at 100% coverage.

  Bug 2 — LanguageSwitcher molecule lives in
  components/molecules/LanguageSwitcher.tsx, mounted in AppShell at
  the bottom-left, between the admin nav and the "me" chip, separated
  by a top border. Two pill buttons (FR / EN) with the active one
  carrying border-accent + text-accent. Click calls
  i18next.changeLanguage and writes "pragma.locale" to localStorage.
  i18n bootstrap reads the persisted value before falling back to
  navigator.language detection. Pure storage helpers extracted to
  locale-storage.utils.ts at 100% coverage (8 tests).

  Final SHA e722218 (verdict commit on top). Four commits (infra banner, argon2→hash-wasm,
  language switcher, knowledge entry). 17 files touched, +393 lines
  net. Tests: infra 177 passed (100% coverage), pragma core 281
  passed, pragma back-e2e 51 passed (full auth flow with hash-wasm).
  Typecheck clean, biome lint clean, vite build clean, knip clean.
  Pushed to claude/pragma-erp-specification-k41Mg.
artifacts:
  - infra/cdk/src/constructs/lambda-api.ts
  - infra/cdk/src/constructs/dsql-schema.ts
  - infra/cdk/src/internal/esm-cjs-interop-banner.ts
  - infra/cdk/test/unit/esm-cjs-interop-banner.test.ts
  - apps/pragma/api/src/auth/auth.service.ts
  - apps/pragma/package.json
  - apps/pragma/site/src/components/molecules/LanguageSwitcher.tsx
  - apps/pragma/site/src/components/organisms/AppShell.tsx
  - apps/pragma/site/src/i18n/i18n.ts
  - apps/pragma/site/src/i18n/locale-storage.utils.ts
  - apps/pragma/site/src/i18n/locale-storage.utils.test.ts
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - docs/knowledge/lambda-esm-native-modules.md
partialDeferrals: []
next:
  kind: validate
---
