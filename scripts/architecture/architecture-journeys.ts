/**
 * Builds one graph per user action, and one per feature.
 *
 * The slice view listed a bounded context's HTTP routes, which is the API's own
 * shape rather than anything a band member does. A person does not append a row
 * to `setlist_entry`; they add a song to a setlist. This module takes that
 * second sentence as the unit.
 *
 * A user action is an exported hook in a `*.queries.ts` module that calls one
 * endpoint. Those are the application's user-facing operations, already named
 * by whoever wrote them — `useAppendSetlistEntry`, `useReorderSetlist` — and
 * each one anchors a flow: the components that trigger it, the endpoint it
 * reaches, the service and repository behind that endpoint, and the tables and
 * external systems at the end. Nothing here is authored; the hook names, the
 * calls and the imports are all read from the source.
 */

import type { GraphEdge, GraphNode } from './architecture-graph';
import type { ArchitectureFile } from './architecture-model';

export interface JourneyAction {
  readonly id: string;
  readonly label: string;
  readonly hook: string;
  readonly feature: string;
  readonly method: string;
  readonly path: string;
  readonly triggerCount: number;
  readonly reaches: readonly string[];
}

export interface JourneyFeature {
  readonly id: string;
  readonly label: string;
  readonly actions: readonly JourneyAction[];
}

export interface JourneyGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

const QUERIES_SUFFIX = '.queries.ts';
const MAXIMUM_TRIGGERS_SHOWN = 5;
const MAXIMUM_WALK_DEPTH = 6;

/** `useAppendSetlistEntry` reads as `Append setlist entry`. */
export function humaniseHook(hook: string): string {
  const withoutPrefix = hook.replace(/^use/, '');
  const spaced = withoutPrefix.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2');
  const lowered = spaced.charAt(0) + spaced.slice(1).toLowerCase();
  return lowered.replace(/\bid\b/i, 'id');
}

function fileLabel(path: string): string {
  return path.split('/').pop() ?? path;
}

/** The component name a file exports, for a node label. */
function componentLabel(file: ArchitectureFile): string {
  const base = fileLabel(file.path).replace(/\.(tsx|ts)$/, '');
  return base;
}

interface WalkResult {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

/**
 * Walk one back-end symbol down through everything it calls.
 *
 * Each visited symbol becomes a node keyed by file and name, so a service two
 * routes share appears once and the two flows visibly meet there. Tables and
 * external systems are attached as leaves of the symbol that names them, which
 * is what makes the end of the flow readable: the reader sees which function
 * touches which table rather than a list at the bottom of the page.
 */
function walkSymbol(
  symbolName: string,
  filePath: string,
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
  seen: Set<string>,
  depth: number,
  sources: Map<string, SourceEntry>,
): WalkResult {
  const key = `${filePath}#${symbolName}`;
  const result: WalkResult = { nodes: [], edges: [] };
  if (depth > MAXIMUM_WALK_DEPTH || seen.has(key)) return result;
  seen.add(key);

  const file = fileByPath.get(filePath);
  if (file === undefined) return result;
  const exported = file.exports.find((each) => each.name === symbolName);
  if (exported === undefined) return result;

  const blueprint = [...exported.blueprints, ...exported.followsBlueprints][0] ?? '';
  sources.set(key, {
    name: symbolName,
    layer: file.layer,
    location: `${file.path}:${exported.line}`,
    blueprint,
    code: exported.source,
  });
  result.nodes.push({
    id: key,
    label: symbolName,
    kind: `step-${file.layer}`,
    detail: `${file.layer} · ${file.path}:${exported.line}`,
    group: file.layer,
    blueprints: exported.blueprints,
    followsBlueprints: exported.followsBlueprints,
    fileCount: 0,
    layer: file.layer,
    location: `${file.path}:${exported.line}`,
    sourceKey: key,
  });

  for (const table of exported.tables) {
    result.nodes.push({
      id: `table:${table}`,
      label: table.replace(/Table$/, ''),
      kind: 'step-table',
      detail: `Database table ${table}`,
      group: 'data',
      blueprints: [],
      followsBlueprints: [],
      fileCount: 0,
      layer: 'table',
    });
    result.edges.push({ from: key, to: `table:${table}`, label: 'writes', kind: 'import' });
  }
  for (const external of exported.dependsOnExternal) {
    result.nodes.push({
      id: `external:${external}`,
      label: external,
      kind: 'step-external',
      detail: `External system ${external}`,
      group: 'external',
      blueprints: [],
      followsBlueprints: [],
      fileCount: 0,
      layer: 'external',
    });
    result.edges.push({ from: key, to: `external:${external}`, label: '', kind: 'import' });
  }

  for (const call of exported.callSymbols) {
    if (call.file === null) continue;
    const target = fileByPath.get(call.file);
    if (target === undefined || target.container !== 'api') continue;
    // A schema module exports the Drizzle tables and the zod validators. The
    // tables are already drawn as their own leaves, and walking into one would
    // draw it twice under two different names.
    if (target.layer === 'schema') continue;
    const nested = walkSymbol(call.name, call.file, fileByPath, seen, depth + 1, sources);
    if (nested.nodes.length === 0) continue;
    result.edges.push({ from: key, to: `${call.file}#${call.name}`, label: '', kind: 'import' });
    result.nodes.push(...nested.nodes);
    result.edges.push(...nested.edges);
  }
  return result;
}

function dedupeNodes(nodes: readonly GraphNode[]): GraphNode[] {
  const byId = new Map<string, GraphNode>();
  for (const node of nodes) byId.set(node.id, node);
  return [...byId.values()];
}

function dedupeEdges(edges: readonly GraphEdge[]): GraphEdge[] {
  const byKey = new Map<string, GraphEdge>();
  for (const edge of edges) byKey.set(`${edge.from}->${edge.to}`, edge);
  return [...byKey.values()];
}

export interface SourceEntry {
  readonly name: string;
  readonly layer: string;
  readonly location: string;
  readonly blueprint: string;
  readonly code: string;
}

export interface JourneyModel {
  readonly features: readonly JourneyFeature[];
  readonly graphs: ReadonlyMap<string, JourneyGraph>;
  /**
   * Every function drawn in any journey, keyed once. The same service appears
   * in several flows, and carrying its source in each would multiply the page
   * by however many actions reach it.
   */
  readonly sources: ReadonlyMap<string, SourceEntry>;
}

export function buildJourneys(files: readonly ArchitectureFile[]): JourneyModel {
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const sources = new Map<string, SourceEntry>();

  const routeOwner = new Map<string, { file: ArchitectureFile; symbol: string }[]>();
  const compositionRoot = files.find((file) => file.path.endsWith('/api/src/app.ts'));
  const mountByRouter = new Map<string, string>();
  for (const mount of compositionRoot?.mounts ?? []) {
    if (mount.targetFile !== null) {
      mountByRouter.set(`${mount.targetFile}#${mount.routerFactory}`, mount.basePath);
    }
  }
  for (const file of files) {
    if (file.layer !== 'controller') continue;
    for (const route of file.routes) {
      const base = mountByRouter.get(`${file.path}#${route.routerVariable}`) ?? '';
      const full = `${base}${route.path === '/' ? '' : route.path}`.replace(/\/+/g, '/');
      const identifier = `${route.method} ${full}`;
      // The handler also references its zod schemas, and a validator is not a
      // step in what the user did, so the flow starts at the first layer that
      // does something: the service, or whatever the controller calls directly.
      const handlers = route.calls.flatMap((call) => {
        if (call.file === null) return [];
        const target = fileByPath.get(call.file);
        if (target === undefined || target.container !== 'api') return [];
        if (target.layer === 'schema' || target.layer === 'middleware') return [];
        return [{ file: target, symbol: call.name }];
      });
      routeOwner.set(identifier, [...(routeOwner.get(identifier) ?? []), ...handlers]);
    }
  }

  const features: JourneyFeature[] = [];
  const graphs = new Map<string, JourneyGraph>();

  const queryModules = files
    .filter((file) => file.path.endsWith(QUERIES_SUFFIX))
    .sort((left, right) => left.path.localeCompare(right.path));

  for (const module of queryModules) {
    const featureId = fileLabel(module.path).replace(QUERIES_SUFFIX, '');
    const actions: JourneyAction[] = [];
    const featureNodes: GraphNode[] = [];
    const featureEdges: GraphEdge[] = [];

    for (const exported of module.exports) {
      if (!exported.name.startsWith('use') || exported.apiCalls.length === 0) continue;
      const call = exported.apiCalls[0];
      if (call === undefined) continue;
      const actionId = `${featureId}:${exported.name}`;
      const hookNodeId = `hook:${exported.name}`;
      const endpointId = `endpoint:${call.method} ${call.path}`;

      const triggers = files.filter(
        (file) =>
          file.container === 'site' &&
          !file.path.endsWith(QUERIES_SUFFIX) &&
          file.imports.some(
            (edge) => edge.targetFile === module.path && edge.namedBindings.includes(exported.name),
          ),
      );

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      for (const trigger of triggers.slice(0, MAXIMUM_TRIGGERS_SHOWN)) {
        // The component that triggers the action is a file rather than one
        // function, so the block opens whichever export carries the file's own
        // name — the component itself — and falls back to the first export when
        // the two do not match.
        const componentName = componentLabel(trigger);
        const componentExport =
          trigger.exports.find((each) => each.name === componentName) ?? trigger.exports[0];
        const triggerKey = `ui:${trigger.path}`;
        if (componentExport !== undefined) {
          sources.set(triggerKey, {
            name: componentExport.name,
            layer: trigger.layer,
            location: `${trigger.path}:${componentExport.line}`,
            blueprint:
              [...componentExport.blueprints, ...componentExport.followsBlueprints][0] ?? '',
            code: componentExport.source,
          });
        }
        nodes.push({
          id: triggerKey,
          label: componentLabel(trigger),
          kind: 'step-ui',
          detail: `${trigger.layer} · ${trigger.path}`,
          group: 'ui',
          blueprints: trigger.blueprints,
          followsBlueprints: trigger.followsBlueprints,
          fileCount: 0,
          layer: trigger.layer,
          location: trigger.path,
          ...(componentExport === undefined ? {} : { sourceKey: triggerKey }),
        });
        edges.push({ from: triggerKey, to: hookNodeId, label: '', kind: 'import' });
      }
      if (triggers.length > MAXIMUM_TRIGGERS_SHOWN) {
        const remaining = triggers.length - MAXIMUM_TRIGGERS_SHOWN;
        nodes.push({
          id: `ui:more:${actionId}`,
          label: `+${remaining} more`,
          kind: 'step-ui',
          detail: triggers
            .slice(MAXIMUM_TRIGGERS_SHOWN)
            .map((each) => each.path)
            .join('\n'),
          group: 'ui',
          blueprints: [],
          followsBlueprints: [],
          fileCount: 0,
        });
        edges.push({ from: `ui:more:${actionId}`, to: hookNodeId, label: '', kind: 'import' });
      }

      const hookBlueprint = [...exported.blueprints, ...exported.followsBlueprints][0] ?? '';
      sources.set(hookNodeId, {
        name: exported.name,
        layer: module.layer,
        location: `${module.path}:${exported.line}`,
        blueprint: hookBlueprint,
        code: exported.source,
      });
      nodes.push({
        id: hookNodeId,
        label: exported.name,
        kind: 'step-hook',
        detail: `${module.layer} · ${module.path}:${exported.line}`,
        group: 'hook',
        blueprints: exported.blueprints,
        followsBlueprints: exported.followsBlueprints,
        fileCount: 0,
        layer: module.layer,
        location: `${module.path}:${exported.line}`,
        sourceKey: hookNodeId,
      });
      nodes.push({
        id: endpointId,
        label: `${call.method} ${call.path}`,
        kind: 'step-endpoint',
        detail: 'HTTP request, session cookie attached',
        group: 'endpoint',
        blueprints: [],
        followsBlueprints: [],
        fileCount: 0,
        layer: 'http',
      });
      edges.push({ from: hookNodeId, to: endpointId, label: 'over HTTPS', kind: 'http' });

      const owners = routeOwner.get(`${call.method} ${call.path}`) ?? [];
      const seen = new Set<string>();
      for (const owner of owners) {
        const walked = walkSymbol(owner.symbol, owner.file.path, fileByPath, seen, 0, sources);
        if (walked.nodes.length === 0) continue;
        edges.push({
          from: endpointId,
          to: `${owner.file.path}#${owner.symbol}`,
          label: '',
          kind: 'import',
        });
        nodes.push(...walked.nodes);
        edges.push(...walked.edges);
      }

      const graph: JourneyGraph = { nodes: dedupeNodes(nodes), edges: dedupeEdges(edges) };
      graphs.set(actionId, graph);
      featureNodes.push(...graph.nodes);
      featureEdges.push(...graph.edges);

      actions.push({
        id: actionId,
        label: humaniseHook(exported.name),
        hook: exported.name,
        feature: featureId,
        method: call.method,
        path: call.path,
        triggerCount: triggers.length,
        reaches: [
          ...new Set(
            graph.nodes
              .filter((node) => node.kind === 'step-table' || node.kind === 'step-external')
              .map((node) => node.label),
          ),
        ],
      });
    }

    if (actions.length === 0) continue;
    graphs.set(`${featureId}:__all__`, {
      nodes: dedupeNodes(featureNodes),
      edges: dedupeEdges(featureEdges),
    });
    features.push({
      id: featureId,
      label: featureId,
      actions: actions.sort((left, right) => left.label.localeCompare(right.label)),
    });
  }

  return { features, graphs, sources };
}
