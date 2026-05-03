# Dantotsus — root-cause analyses with shipped eradications

One file per defect. Each is a **Dantotsu**: Symptom → Root-cause
chain → Detection failure causes → Countermeasure → **Eradication**
(code-level, non-optional). The Eradication section links the
commit hash, PR, and a diff snippet showing the fix.

Standard at [`.claude/skills/dantotsu/standard.md`](../../.claude/skills/dantotsu/standard.md).
Template at [`_template.md`](./_template.md). Skill at
[`.claude/skills/dantotsu/SKILL.md`](../../.claude/skills/dantotsu/SKILL.md).

## Eradication ladder

Each entry's `eradication-level` frontmatter records which level was
reached. The ladder, top is best:

1. **Structural impossibility** — types / API shapes prevent the
   misconception from being expressed at all.
2. **DevX check** — linter / type guard / pre-commit / actionlint /
   GritQL plugin rejects the misconception at lint or commit time.
3. **Vendor patch** — `patches/<lib>/<short>.patch` applied via
   `pnpm patch`, plus a `.md` with the upstream-PR body the human
   will paste. Agent does NOT open PRs against repos outside
   `hugoleborso/*`.
4. **Detection** — alarm, synth-time test, integration test that
   catches the next instance before users see it.
5. **Knowledge** — only as floor when 1–4 are genuinely impossible.
   Pure-knowledge subjects belong under [`../knowledge/`](../knowledge/)
   instead.

A Dantotsu whose only eradication is "knowledge" is almost always
misclassified — re-read the root-cause section and push harder.

## Index

### CDK / AWS infrastructure

- [`bucketdeployment-cloudfront-invalidation.md`](./bucketdeployment-cloudfront-invalidation.md) — preview HTML stayed stale ~24 h after redeploy.
- [`bucketdeployment-prune-default.md`](./bucketdeployment-prune-default.md) — manually-uploaded objects vanished on the next deploy.
- [`cdk-nodejsfunction-bundling.md`](./cdk-nodejsfunction-bundling.md) — synth-heavy unit tests hit a vitest worker IPC timeout.
- [`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md) — preview returned `503 FunctionExecutionError`.
- [`s3-oac-403-not-404.md`](./s3-oac-403-not-404.md) — broken links rendered "Access Denied"; custom 404 rule never fired.
- [`aws-budgets-usd-only.md`](./aws-budgets-usd-only.md) — `cdk deploy` of the shared stack failed on budget unit.
- [`dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — preview synth failed with SSM-parameter-not-found for a brand-new DB-using app.

### GitHub Actions / CI

- [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md) — `detect` job aborted with `git exit 128` on push to main.

### pnpm / monorepo

- [`pnpm-reserved-script-names.md`](./pnpm-reserved-script-names.md) — CI's "deploy" step ran the wrong thing (pnpm built-in vs script).
- [`shared-deploy-stale-dist.md`](./shared-deploy-stale-dist.md) — `pnpm shared-infra deploy` shipped a stale `@borso/infra` dist.

## Reading the frontmatter

| Field | Meaning |
| --- | --- |
| `introduced-at` | Stage where the defect was *born*. `conception` (design wrong), `implementation` (design right, code didn't match), `self-validation` (developer's checks didn't catch), `code-review` (reviewer didn't catch). |
| `detected-at` | Where the defect was *finally* caught. Walk the defence-in-depth ladder: typing → linter → local → ci → review → qa → staging → production → operator-deploy. |
| `severity` | User impact at the time of detection. `low`: nobody noticed. `medium`: degraded UX, recoverable. `high`: user-blocking or data-integrity. |
| `eradication-level` | Level reached on the ladder above. Should be 1 if at all possible. |
| `fix-commits` | The actual commits that landed the eradication — not the original countermeasure. Always linkable. |
| `time-to-detect` | Wall-clock from "lives in main" to "we noticed". |
| `tags` | Topics for grep / future skill matching. |

Patterns to watch as the corpus grows:

- Many `introduced-at: conception` → design isn't getting enough scrutiny.
- Many `detected-at: production` with `high` severity → defence-in-depth has gaps.
- Many `eradication-level: 5` → we're settling for documentation when we could reach higher. Push back.

## Adding a new entry

The [`/dantotsu`](../../.claude/skills/dantotsu/SKILL.md) skill walks
the seven steps and produces a complete entry that matches
[`_template.md`](./_template.md). After-task sweep: see
[`/after-task-dantotsus`](../../.claude/skills/after-task-dantotsus/SKILL.md).
