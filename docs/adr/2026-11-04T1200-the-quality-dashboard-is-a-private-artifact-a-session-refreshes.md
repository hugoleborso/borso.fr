# ADR-2026-11-04T1200: The quality dashboard is a private artifact a session refreshes

- **Status:** accepted
- **Date:** 2026-11-04
- **Deciders:** Hugo Borsoni
- **Tags:** quality-dashboard, observability

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| The numbers stay private | operator | high | The operator asked on 2026-11-04 not to expose error and vulnerability counts publicly | Who can open the page without being given access |
| No new credential or role | author | high | Each one is a secret to rotate and an attack surface for a reporting page | Count of roles, tokens and database grants the option adds |
| No manual counting | author | medium | A count copied by hand stops after a few weeks | Whether any number on the page is typed by a person |

## Context

The 3S board ([spec](../features/meta/quality-dashboard/spec/spec.md)) reads CloudWatch, Sentry, GitHub security alerts and pragma's bug reports. A first version published it from `pages.yml` on GitHub Pages. That needed an OIDC role for CloudWatch, a Sentry read token, and a database role for CI to read pragma's production `improvement` table. The page was public. A Claude session already holds every one of these accesses: AWS read keys, the Sentry MCP, the Pragma MCP and `gh`.

## Decision

**A private claude.ai artifact, refreshed by a session on request.** The repository keeps the renderer and `.claude/skills/quality-dashboard/SKILL.md`. The session writes a snapshot of what only its MCP connections can read, the renderer reads CloudWatch and `pnpm audit` itself, and the session republishes the artifact to one URL. No page and no data are committed.

## Consequences

- `+` No role, no token and no database grant to create or rotate.
- `+` Only the operator, and whoever they share it with, can open the page.
- `-` The numbers move only when the operator asks a session to refresh them. Nothing refreshes them on a schedule.
- `-` The page records no history. A trend is rebuilt from the sources on each refresh, eight weeks deep.
- `~` Secret scanning is unreachable from a hosted session (the proxy refused it on 2026-11-04), and Dependabot alerts are disabled on the repository. Both cells read "unavailable" until that changes.

## Alternatives considered

### Option A: private artifact refreshed by a session (chosen)

- **Summary:** as above.
- **Strengths:** private, no new credential.
- **Costs:** a refresh needs a session.
- **Rationale:** the only option that meets both high criteria.

### Option B: GitHub Pages, built daily in CI (rejected)

- **Summary:** the first version, with `QualityReadRole`, `SENTRY_READ_TOKEN` and a `quality_reader` database role.
- **Strengths:** refreshes without anyone asking.
- **Costs:** three new credentials, and a public page.
- **Rejection rationale:** fails both high criteria.

### Option C: a Sentry or CloudWatch dashboard (rejected)

- **Summary:** build the board inside one vendor's console.
- **Strengths:** live data.
- **Costs:** neither console sees the other sources or the dantotsu record.
- **Rejection rationale:** the defect map and the security pillar have no home there.

## Evaluation rubric

|             | Option A | Option B | Option C |
|---|---|---|---|
| The numbers stay private | ✓ private artifact | ✗ public Pages | ✓ console login |
| No new credential or role | ✓ none | ✗ three | ✓ none |
| No manual counting | ✓ the session counts | ✓ CI counts | ✗ two consoles plus the dantotsus |

## Implementation pointers

- Spec: `docs/features/meta/quality-dashboard/spec/spec.md`
- Files: `scripts/quality/quality-dashboard.ts`, `scripts/quality/quality-sources.adapter.ts`, `.claude/skills/quality-dashboard/SKILL.md`
