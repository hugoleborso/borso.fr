---
date: 2026-05-25
introduced-at: implementation
detected-at: review
severity: medium
related-pr: 27
fix-pr: 27
fix-commits: [82f0e29, cfb24e2]
eradication-level: 1
time-to-detect: hours
tags: [biome, formatter, hooks, pre-commit, ci, self-improvement-loop]
---

# A whole PR of formatter drift accumulated invisibly because only `biome lint` was gated

## Symptom

Halfway through PR #27, ran `biome check` manually for the first
time and discovered ~100 files would-be-reformatted. None of them
had broken `biome lint` — the lint pass at pre-commit + CI was
green. The formatter rules (line width, JSX attribute reflow,
import ordering) had been silently drifting commit after commit.

When the agent reverted the formatter pass calling it "noise", the
user pushed back hard :

> "Comment ça formatter noise, c'est super important de faire du
> biome format. Fais le dans un commit à part si tu veux mais fais
> le. ça devrait être dans les hooks + dans le commitlint."

## Root-cause chain

1. **Why?** `.husky/pre-commit` ran `pnpm exec biome lint` only.
   `biome lint` runs lint rules but skips formatter checks ; format
   drift therefore lands without complaint.
2. **Why?** CI mirrored the same `biome lint` invocation
   (`.github/workflows/ci.yml` + `pnpm -r lint` from each
   workspace's `lint` script defined as `biome lint`).
3. **Why?** Each app workspace's `package.json` set
   `"lint": "biome lint"`, propagating the same lint-only gate
   into `pnpm -r lint`.

**Root cause:** _thought `biome lint` covered everything biome
checks, actually biome splits lint and format — only `biome check`
runs both, and we'd only wired the half that skipped the formatter
rules._

## Detection failure causes

- **Typing / static analysis:** N/A — this is about formatting
  style, not behaviour.
- **Linter:** `biome lint` itself was running, fine, just not
  asked to check formatting.
- **CI:** Same as the hook — running lint, not check.
- **Code review:** Formatter drift is invisible in line-by-line
  review when each commit was locally clean against its own author's
  editor settings.
- **Quality bar:** docs/dantotsus/biome-lint-was-not-gated-anywhere.md
  closed the _lint_-gating gap in 2026-04 ; the _format_-gating
  gap survived.

## Countermeasure

Move every reference of `biome lint` to `biome check` :

- `.husky/pre-commit` → `pnpm exec biome check`
- `.github/workflows/ci.yml` → `pnpm exec biome check` at the
  root scope + `pnpm -r lint` keeps the workspace cascade.
- Each `apps/<x>/package.json` and `infra/<x>/package.json`
  → `"lint": "biome check"`.

`biome check` runs lint AND format checks in one pass ; pre-commit

- CI now reject any commit that introduces format drift.

Bonus : the repo-wide formatter pass that closed the accumulated
debt landed in `cfb24e2 chore(meta): repo-wide biome formatter
pass` (120 files, pure mise en forme, no semantic change).

## Eradication shipped

**Type:** code diff (level 1 — formatter drift is now structurally
unable to land without failing pre-commit / CI)

**Reference:** PR #27 · commits
[`82f0e29`](https://github.com/hugoleborso/borso.fr/commit/82f0e29) +
[`cfb24e2`](https://github.com/hugoleborso/borso.fr/commit/cfb24e2)

**The actual fix:**

```diff
-echo "[pre-commit] running biome lint"
-pnpm exec biome lint
+echo "[pre-commit] running biome check (lint + format)"
+pnpm exec biome check
```

(equivalent change in CI + each workspace's `lint` script)

**Sibling defects swept:** every workspace's `lint` script flipped
in the same commit ; the repo-wide formatter pass swept 120 files
of accumulated drift.

## See also

- [`docs/dantotsus/biome-lint-was-not-gated-anywhere.md`](./biome-lint-was-not-gated-anywhere.md)
  — sibling gap closed earlier ; this dantotsu closes the
  format-only half that was missed.
