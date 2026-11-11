---
date: 2026-11-05
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#263'
fix-pr: none (shipped by the lessons-from-pr-263 kaizen pull request, numbered once it opens)
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
| First version of the 3S board | a public GitHub Pages page, an OIDC role, a Sentry token and a production database role, three ADRs | a private page, no new credential |

The operator stopped it in one sentence on 2026-11-04 ("pas sûr qu'on veuille l'exposer en public"). The CI version was rebuilt as a private artifact, and the role, the token, the grant and three ADRs were dropped.

## Causal chain

- The board's first version was public and needed three new credentials.
  - The spec chose GitHub Pages because the weak-point map already published there.
    - The spec's questions covered what to show and from which source, never who may see it.
      - The session already read every source (AWS read keys, the Sentry and Pragma MCP servers, `gh`), and nobody asked whether the session itself could be the publisher.

## Root cause of occurrence

*Thought a report goes where the repository's other reports go, actually where it goes is decided by who may read it.*

`.claude/skills/specification/template.md` asked for "the final, visible result" and nothing about its audience.

## Detection failure causes

- **Specification:** no prompt in the template names the audience of a result.
- **ADR walk:** the three ADRs compared ways to grant CI access, so the option of no CI at all was never a row.

## Countermeasure

PR #263 rebuilt the board as a private artifact a session refreshes (ADR 2026-11-04T1200).

## Eradication

**Type:** knowledge (level 5). A gate cannot tell which results are sensitive, so the question goes where every spec is drafted.

**Reference:** the lessons-from-pr-263 kaizen pull request · commit `[self]`

```diff
 - "No visible result" is a red flag — name it.
+- **Audience:** who can open the result, and where it lives. A page, a report or a dashboard published where the repository's other outputs go is public by default; say so, or say why it is not.
```

**Proof it can fail:** not applicable at level 5.

**Similar instances:** `grep -rln "github.io\|pages.yml" docs/features` lists the features that published a page; each predates this question.
