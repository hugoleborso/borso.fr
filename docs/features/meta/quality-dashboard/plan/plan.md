# Plan: the 3S quality dashboard

Spec: [`spec.md`](../spec/spec.md). ADR: [202611041200](../../../../adr/202611041200-the-quality-dashboard-is-a-private-artifact-a-session-refreshes.md).

## Where each decision lands

| Spec decision | Lands in |
| --- | --- |
| Stage A to E from `detected-at` | `selectStage` in `scripts/quality/weak-points.core.ts`; each dot carries `stage` and `link` |
| Dots coloured by stage, engaged weak point ringed | `renderDot` and `renderVaricelle` in `weak-points-page.core.ts` |
| Snapshot schema, weekly windows, API mapping, metric queries, targets | `scripts/quality/quality-dashboard.core.ts` |
| 3S band, banner, defect map, artifact fragment | `quality-dashboard-page.core.ts`, `renderQualityFragment` in `quality-page.core.ts` |
| CloudWatch, `pnpm audit`, snapshot file | `quality-sources.adapter.ts` |
| Refresh procedure and artifact URL | `.claude/skills/quality-dashboard/SKILL.md` |
| `kind` on Improvement and in the MCP tool | `apps/pragma/` (domain, schema, repository, service, tools controller, form, list) and migration `0024_improvement_kind.sql` |

## Risks

| Risk | Detection | Mitigation |
| --- | --- | --- |
| A session writes a wrong snapshot | The renderer's schema refuses it | Fix the snapshot. The renderer never draws a malformed file. |
| A Sentry event without the `app` tag | It is missing from every app's count | Only pragma reports to Sentry today. Another app that starts reporting sets the tag. |
| The Pragma MCP does not return `kind` before this branch deploys | The bug report cell reads unavailable | It clears once the branch is merged and deployed. |

## Gates before push

- `vitest run scripts/quality --coverage` at 100% on every `scripts/quality/*.core.ts`, and Stryker on the changed ones.
- oxlint (type-aware), `tsc --noEmit`, knip.
- pragma typecheck, lint, core and e2e tests for improvements and MCP.
- One render from a session and one publish to the artifact.
