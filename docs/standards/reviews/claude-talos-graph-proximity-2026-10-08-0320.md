# Standards review — claude/talos-graph-proximity against origin/main

Verdict: PASS
Ledger: 67e6dd945aed
Reviewed: 8 file(s). Sealed: 8. Findings: 0.

## Findings

None.

## Sealed

- apps/talos/VOCABULARY.md — the Graph entry matches the code: `proximity`, `seen`, `isClosed` on the domain types, "begun by that date" matches `hasRelationStartedBy`, and `RelationTie` with its four values lives in `graph-layout.core.ts` as stated.
- apps/talos/api/src/graph/graph.service.ts — a one-line delegation to `projectPageNode`.
- apps/talos/domain/graph.core.ts — `project…` and `build…` return what their verbs say, `readProximity` returns null on any value outside 1 to 5, and the relation line goes through Zod.
- apps/talos/site/src/components/organisms/KnowledgeGraph.tsx — the disable reason still names force-graph as the external system. 375 px judged from the diff, which changes no container class (the canvas keeps `h-[60dvh] overflow-hidden`), and from the branch screenshots at about 395 px wide. `computeCentredZoom` fits to `min(width, height)`, so the layout fits a narrow screen by construction. agent-browser could not get past the passkey login on the dev server (logged to kaizen).
- apps/talos/site/src/components/organisms/graph-layout.core.ts — `select…` functions return what they name, and the domain vocabulary (tie, proximity, owner) fits the `.core.ts` suffix.
- apps/talos/site/src/components/organisms/graph-simulation.core.ts — the `.core.ts` suffix fits. It is used only by the knowledge graph, not shared code, and it decides a product behaviour: positions stay put across recomputes, and a new page appears beside its neighbours.
- apps/talos/site/src/components/organisms/knowledge-graph.core.ts — the branch only deleted code (render projection moved to graph-layout); the rest has no findings.
- apps/talos/site/src/lib/graph-forces.adapter.ts — the name and suffix fit a file that wraps the force-graph library. `ForceHost` and `LayoutHost` declare only the methods the file calls.

## Unclear

None.

## Outside the checklist

- `apps/talos/site/src/lib/graph-forces.adapter.ts:18` exports a `GraphNode` whose shape (`RenderableNode` plus simulation fields) differs from the domain `GraphNode` that VOCABULARY.md defines. Before this branch it was a local interface in KnowledgeGraph.tsx; the branch exported it. Renaming it `SimulationNode` would avoid having two exported types with the same name.
- `apps/talos/site/src/lib/graph-forces.adapter.ts:54` claims `@FollowsBlueprint injected-storage-slice`, a blueprint about browser storage. The minimal host interfaces follow its idea, but the marker sits on `buildRadialForce`, which takes no host.
- `apps/talos/site/src/lib/graph-forces.adapter.ts:96` keeps positions in a module-level `Map` that lives across mounts. Only tests call `forgetPositions`.
- `apps/talos/domain/graph.core.ts:103` `isRelationTrueOn` is now used only by its tests.
- `apps/talos/domain/graph.core.ts:121` `GraphPageSummary` copies `PageSummary` minus `body` by hand. `Omit<PageSummary, 'body'>` would derive it. Not a finding, because the typing bullet only covers Drizzle, Zod and Hono sources.
- `apps/talos/site/src/components/organisms/graph-layout.core.ts:13` `UNSCORED_RADIUS = 215` repeats `RADIUS_BY_PROXIMITY[2]`, so the two can drift apart.
