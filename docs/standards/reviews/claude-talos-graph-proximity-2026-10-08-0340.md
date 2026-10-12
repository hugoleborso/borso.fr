# Standards review — claude/talos-graph-proximity against origin/main

Verdict: PASS
Ledger: 67e6dd945aed
Reviewed: 1 file(s). Sealed: 1. Findings: 0.

The rebase onto main left seven of the eight reviewable files with seals that still match their content (`seal.ts verify` says so). Those seals come from the 0320 review. Only `apps/talos/VOCABULARY.md` showed as `edited-since-it-was-reviewed`, because main's vocabulary entries were merged into it. This review covers that file alone.

## Findings

None.

## Sealed

- apps/talos/VOCABULARY.md — read in full. The Graph entry still matches the code: `GraphNode.proximity`, plus `GraphEdge.seen` and `isClosed` in `domain/graph.core.ts`; "begun by that date" is `hasRelationStartedBy`; `RelationTie` and its four values are in `graph-layout.core.ts`. Entries merged from main were checked against the code: `reinstateTodo` and `{ todo, line, position }` in `todos.service.ts`, `classifySource` and `SourceReference` in `source-reference.core.ts`, `cancelProposalDecision` outside `PROPOSAL_DECISIONS`, and `selectUnclaimedCommitments`.

## Unclear

None.

## Outside the checklist

- The advisory notes from the 0320 review still apply, because those files did not change.
