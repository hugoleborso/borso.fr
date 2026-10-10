# Plan: weak point management for the dantotsu record

Spec: [`../spec/spec.md`](../spec/spec.md).

## Where each part lands

| Spec item | Files |
| --- | --- |
| 1. Schema check | `scripts/quality/dantotsu-record.core.ts` reads the front matter; `scripts/quality/dantotsu-schema.core.ts` holds the rules; `scripts/quality/check-dantotsu-front-matter.ts` reads the corpus and git; `.husky/pre-commit` and `.github/workflows/ci.yml` run it; `docs/standards/12-linting-and-gates.md` cites it |
| 2. Backfill | every file in `docs/dantotsus/`, front matter only, plus one status line where an eradication no longer exists in the form described and the placeholders in the text |
| 3. Zone and weak point | `zone:`, `weak-point:` and `recurs:` in the front matter; the zone and weak point are resolved by `scripts/quality/weak-points.ts --check` |
| 4. Weak-points generator | `scripts/quality/weak-points.core.ts` (placement, weekly count, recurrence groups), `scripts/quality/weak-points-page.core.ts` (the page), `scripts/quality/weak-points.ts`; `scripts/reports.sh`, `.github/workflows/pages.yml`, `.gitignore` |
| 5. Engaged weak points | `docs/quality/weak-points.md` |
| 6. Working-conditions board | `docs/quality/working-conditions.md` declares the walls; `scripts/quality/working-conditions.core.ts`, `scripts/quality/working-conditions-page.core.ts`, `scripts/quality/working-conditions.ts` |
| 7. Skills | `docs/dantotsus/_template.md`, `plugins/borso-harness/skills/dantotsu/SKILL.md`, `plugins/borso-harness/skills/dantotsu/standard.md`, `plugins/borso-harness/skills/after-task-dantotsus/SKILL.md` |
| 8. ADR | `docs/adr/0029-weak-point-management-from-the-dantotsu-record.md` and its index line |

The two page renderers share `scripts/quality/quality-page.core.ts`, and
every core reads a capture group or a cell through
`scripts/quality/require-at.core.ts`, which throws instead of falling back,
so no unreachable fallback branch stands between a file and 100% coverage.

## Risks

| Risk | Detection | Mitigation |
| --- | --- | --- |
| A shallow clone resolves no old commit | the check names `git fetch --unshallow` in its error | CI's build job checks out the full history; pre-commit resolves staged entries only |
| A local `origin/main` older than a just-merged fix | the commit does not resolve | the error names `git fetch origin main` |
| A rename orphans a zone or an eradication path | pre-commit runs the checks on any staged deletion or rename | CI runs them on every push |
| `zone:` is wrong but exists | nothing mechanical | the reviewer reads it; ADR-0029 names the limit |
| Every new entry shares two tags with an old one | the recurs rule fires often | `recurs: none (<reason>)` is a one-line answer, and asking the question is the point |

## Pre-flight gates

- `pnpm exec vitest run scripts/quality --coverage`
- `pnpm exec stryker run --mutate <the eight scripts/quality/*.core.ts files>`
- `pnpm run typecheck`, `scripts/lint-repository.sh`, `pnpm run format:check`
- `pnpm exec tsx scripts/quality/check-dantotsu-front-matter.ts`
- `pnpm exec tsx scripts/quality/weak-points.ts --check`
- `pnpm exec tsx scripts/quality/working-conditions.ts --check`
- `pnpm exec tsx scripts/standards/enforcement-ledger.ts --check`
- the pre-commit hook as a whole, on the commit itself
