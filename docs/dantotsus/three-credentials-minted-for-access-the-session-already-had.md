---
date: 2026-11-05
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#263'
fix-commits: [self]
eradication-level: 5
eradication-paths: [.claude/skills/specification/template.md]
time-to-detect: days
tags: [meta, process, skill]
zone: .claude/skills/specification/template.md
recurs: none (no earlier entry records a design that published data the operator had not chosen to publish)
---

# Three credentials were minted to publish numbers the operator wanted private

## User impact

| | Seen | Expected |
| --- | --- | --- |
| First version of the 3S board | A public GitHub Pages page, an OIDC role, a Sentry token and a production database role, three ADRs | A private page, no new credential |

The operator stopped it in one sentence on 2026-11-04 ("pas sûr qu'on veuille
l'exposer en public", "not sure we want to expose it publicly"). The CI
version was rebuilt as a private artifact. The role, the token, the grant and
three ADRs were dropped (measured in #263's history).

## Causal chain

- The board's first version was public and needed three new credentials.
  - Branch 1: it was public. The spec chose GitHub Pages because the
    weak-point map already published there.
    - The spec's author, an agent, filled
      `.claude/skills/specification/template.md`. Its prompts asked for "the
      final, visible result" and its sources, and nothing about who may open
      it. The operator's wish to keep the numbers private was not in its
      context. **Material.**
  - Branch 2: it needed three credentials. A Pages build runs in CI, and CI
    holds none of the read access the session had (AWS read keys, the Sentry
    and Pragma MCP servers, `gh`). Each source then needed its own grant: an
    OIDC role, a Sentry token, a production database role.
    - The three ADRs compared ways to grant CI access, which follows from
      branch 1's choice of a CI publisher.

## Root cause of occurrence

*Thought a report goes where the repository's other reports go, actually
where it goes is decided by who may read it, and a page on GitHub Pages is
public.* **Material.**

The template the spec was drafted from asked for "the final, visible result"
and nothing about its audience. Under the agentic 4M rule, the fact that
decides the publisher, the audience, was absent from the agent's context.

## Detection failure causes

- **Specification:** no prompt in the template named the audience of a
  result, so the spec had no line a reviewer could disagree with.
- **ADR walk:** the three ADRs compared ways to grant CI access. The option
  of no CI at all, with the session as the publisher, was never a row,
  because every ADR started from the publisher the spec had chosen.
- **CI:** nothing refuses a change that adds to what `pages.yml` publishes.

## Countermeasure

PR #263 rebuilt the board as a private artifact a session refreshes (ADR
2026-11-04T1200).

## Eradication

**Type:** knowledge (level 5)

**Reference:** the commit adding this file added the audience question to the
spec template.

```diff
 - "No visible result" is a red flag — name it.
+- **Audience:** who can open the result, and where it lives. A page, a report or a dashboard published where the repository's other outputs go is public by default; say so, or say why it is not.
```

The line brings the missing fact to the moment a spec is drafted, which is
the fix for a Material cause. It is still a written instruction, so it holds
only when the template is read.

**Proof it can fail:** not applicable at level 5.

**Proposed:** a gate cannot judge sensitivity, but it can see publicity. The
only public publisher in the repository is `.github/workflows/pages.yml`
(`actions/upload-pages-artifact` with `path: docs/architecture`, fed by a
copy list of files). A pre-commit and CI check could refuse a new
`upload-pages-artifact` or `deploy-pages` step in any workflow, and any change
to the files `pages.yml` copies or to its `path:`, unless the same change adds
an ADR. Publishing in public would then be a decision made on purpose, at
level 2.

**Similar instances:** `grep -rln "github.io\|pages.yml" docs/features` lists
the features that published a page. Each predates the audience question.
`grep -rn "upload-pages-artifact\|deploy-pages" .github/workflows` finds the
one publisher.
