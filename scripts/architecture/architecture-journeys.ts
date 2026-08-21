import type { GraphEdge, GraphNode, NodeChip } from './architecture-graph';
import {
  BLUEPRINT_ICON,
  COMPLEXITY_ICON,
  DISABLE_ICON,
  LAYER_GROUP_ICON,
  SIZE_ICON,
} from './architecture-icons';
import {
  type ArchitectureFile,
  type ExportedSymbol,
  type ScreenRoute,
  symbolMetrics,
} from './architecture-model';

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
  readonly overview: boolean;
}

export interface JourneyGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

const QUERIES_SUFFIX = '.queries.ts';
const QUERY_LAYER = 'query';
const SCHEMA_LAYER = 'schema';
const LAYERS_A_FLOW_DOES_NOT_START_AT = new Set([SCHEMA_LAYER, 'middleware']);
const MAXIMUM_WALK_DEPTH = 6;
const MAXIMUM_SCREEN_WALK_STEPS = 500;

const VERB_BY_TRAILING_NOUN: Readonly<Record<string, string>> = {
  list: 'list',
  detail: 'open',
  search: 'search',
};

export function humaniseHook(hook: string): string {
  const withoutPrefix = hook.replace(/^use/, '');
  const words = withoutPrefix.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2').split(' ');
  const trailing = (words.at(-1) ?? '').toLowerCase();
  const verb = VERB_BY_TRAILING_NOUN[trailing];
  const ordered = verb === undefined ? words : [verb, ...words.slice(0, -1)];
  const spaced = ordered.join(' ');
  const lowered = spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  return lowered.replace(/\bid\b/i, 'id');
}

function fileLabel(path: string): string {
  return path.split('/').pop() ?? path;
}

function componentLabel(file: ArchitectureFile): string {
  const base = fileLabel(file.path).replace(/\.(tsx|ts)$/, '');
  return base;
}

interface OwnedScreenRoute extends ScreenRoute {
  readonly owner: string;
}

interface WalkResult {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

function screensReaching(
  filePath: string,
  screens: readonly OwnedScreenRoute[],
  importersOf: ReadonlyMap<string, readonly string[]>,
): OwnedScreenRoute[] {
  const reachable = new Set<string>([filePath]);
  const queue = [filePath];
  let steps = 0;
  while (queue.length > 0 && steps < MAXIMUM_SCREEN_WALK_STEPS) {
    steps += 1;
    const current = queue.shift();
    if (current === undefined) continue;
    for (const importer of importersOf.get(current) ?? []) {
      if (reachable.has(importer)) continue;
      reachable.add(importer);
      queue.push(importer);
    }
  }
  return screens.filter(
    (screen) => screen.componentFile !== null && reachable.has(screen.componentFile),
  );
}

function renderedBy(
  seeds: readonly string[],
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
  isStopped: (file: ArchitectureFile) => boolean,
): ArchitectureFile[] {
  const seen = new Set<string>();
  const found: ArchitectureFile[] = [];
  const queue = [...seeds];
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined || seen.has(path)) continue;
    seen.add(path);
    const file = fileByPath.get(path);
    if (file === undefined) continue;
    if (!seeds.includes(path)) {
      if (isStopped(file)) continue;
      found.push(file);
    }
    for (const edge of file.imports) {
      if (edge.targetFile !== null && !seen.has(edge.targetFile)) queue.push(edge.targetFile);
    }
  }
  return found.sort((left, right) => left.path.localeCompare(right.path));
}

function compositionNode(file: ArchitectureFile, sources: Map<string, SourceEntry>): GraphNode {
  const key = `ui:${file.path}`;
  const exported =
    file.exports.find((each) => each.name === componentLabel(file)) ?? file.exports[0];
  const blueprint = [...file.blueprints, ...file.followsBlueprints][0] ?? '';
  if (exported !== undefined) {
    sources.set(key, sourceEntry(file.path, file.layer, blueprint, exported));
  }
  return {
    id: key,
    label: componentLabel(file),
    kind: `step-${file.layer}`,
    detail: `${file.layer} · ${file.path}`,
    group: file.layer,
    blueprints: file.blueprints,
    followsBlueprints: file.followsBlueprints,
    fileCount: 0,
    layer: file.layer,
    location: file.path,
    icon: LAYER_GROUP_ICON[file.layer] ?? '\u{1F9E9}',
    lines: [file.layer],
    ...(exported === undefined
      ? {}
      : {
          sourceKey: key,
          metrics: symbolMetrics(exported),
          chips: symbolChips(blueprint, exported),
        }),
  };
}

function symbolChips(blueprint: string, symbol: ExportedSymbol): NodeChip[] {
  const metrics = symbolMetrics(symbol);
  return [
    ...(blueprint === ''
      ? []
      : [{ icon: BLUEPRINT_ICON, text: blueprint, tone: 'blueprint' as const }]),
    { icon: SIZE_ICON, text: `${metrics.lines} lines`, tone: 'size' as const },
    { icon: COMPLEXITY_ICON, text: `cx ${metrics.complexity}`, tone: 'complexity' as const },
    ...(metrics.disables > 0
      ? [
          {
            icon: DISABLE_ICON,
            text: `${metrics.disables} disable${metrics.disables === 1 ? '' : 's'}`,
            tone: 'warn' as const,
          },
        ]
      : []),
  ];
}

function tableDeclaration(
  table: string,
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
): { file: ArchitectureFile; symbol: ExportedSymbol } | undefined {
  for (const file of fileByPath.values()) {
    if (file.layer !== SCHEMA_LAYER) continue;
    const symbol = file.exports.find((each) => each.name === table);
    if (symbol !== undefined) return { file, symbol };
  }
  return undefined;
}

function sourceEntry(
  path: string,
  layer: string,
  blueprint: string,
  symbol: ExportedSymbol,
): SourceEntry {
  return {
    name: symbol.name,
    layer,
    location: `${path}:${symbol.line}`,
    blueprint,
    code: symbol.source,
    lines: symbol.lineCount,
    complexity: symbol.complexity,
    disables: symbol.lintExceptions,
  };
}

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
  sources.set(key, sourceEntry(file.path, file.layer, blueprint, exported));
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
    metrics: symbolMetrics(exported),
    icon: LAYER_GROUP_ICON[file.layer] ?? '\u{1F4C4}',
    lines: [file.layer],
    chips: symbolChips(blueprint, exported),
  });

  for (const table of exported.tables) {
    const declaration = tableDeclaration(table, fileByPath);
    const tableKey = `table:${table}`;
    if (declaration !== undefined) {
      sources.set(
        tableKey,
        sourceEntry(declaration.file.path, declaration.file.layer, '', declaration.symbol),
      );
    }
    result.nodes.push({
      id: tableKey,
      label: table.replace(/Table$/, ''),
      kind: 'step-table',
      detail:
        declaration === undefined
          ? `Database table ${table}`
          : `${table} · ${declaration.file.path}`,
      group: 'data',
      blueprints: [],
      followsBlueprints: [],
      fileCount: 0,
      layer: 'table',
      ...(declaration === undefined
        ? {}
        : {
            location: `${declaration.file.path}:${declaration.symbol.line}`,
            sourceKey: tableKey,
            metrics: symbolMetrics(declaration.symbol),
          }),
      icon: '\u{1F5C4}',
      lines: ['database table'],
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
      icon: '\u{1F310}',
      lines: ['external system'],
    });
    result.edges.push({ from: key, to: `external:${external}`, label: '', kind: 'import' });
  }

  for (const call of exported.callSymbols) {
    if (call.file === null) continue;
    const target = fileByPath.get(call.file);
    if (target === undefined || target.container !== 'api') continue;
    if (target.layer === SCHEMA_LAYER) continue;
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
  readonly baseCode?: string;
  readonly lines: number;
  readonly complexity: number;
  readonly disables: number;
}

export interface JourneyModel {
  readonly features: readonly JourneyFeature[];
  readonly graphs: ReadonlyMap<string, JourneyGraph>;
  readonly sources: ReadonlyMap<string, SourceEntry>;
  readonly drawnFiles: ReadonlySet<string>;
}

const SHELL_FEATURE_ID = 'shell';
const REQUEST_FEATURE_ID = 'request';

const JOURNEY_LABELS: Record<string, string> = {
  [SHELL_FEATURE_ID]: 'opening the app',
  [REQUEST_FEATURE_ID]: 'serving a request',
  shared: 'shared front end',
};

function journeyLabel(featureId: string): string {
  return JOURNEY_LABELS[featureId] ?? featureId;
}
const SHARED_FEATURE_ID = 'shared';

function isFrontEndModule(file: ArchitectureFile): boolean {
  return file.container === 'site' || file.container === 'domain';
}

function filePathOf(location: string | undefined): string[] {
  if (location === undefined) return [];
  const [filePath] = location.split(':');
  return filePath === undefined ? [] : [filePath];
}

function addComposition(
  nodes: GraphNode[],
  edges: GraphEdge[],
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
  sources: Map<string, SourceEntry>,
  featureId: string,
): void {
  const drawn = new Set(
    nodes.flatMap((node) =>
      node.id.startsWith('ui:') ? [node.id.slice('ui:'.length)] : filePathOf(node.location),
    ),
  );
  const seeds = nodes
    .filter((node) => node.id.startsWith('ui:'))
    .map((node) => node.id.slice('ui:'.length));
  if (seeds.length === 0) return;

  const rendered = renderedBy(
    seeds,
    fileByPath,
    (file) => !isFrontEndModule(file) || file.feature !== featureId,
  );
  const inGraph = new Set([...seeds, ...rendered.map((file) => file.path)]);
  for (const file of rendered) {
    if (drawn.has(file.path)) continue;
    nodes.push(compositionNode(file, sources));
  }
  for (const path of inGraph) {
    const file = fileByPath.get(path);
    if (file === undefined) continue;
    for (const edge of file.imports) {
      if (edge.targetFile === null || !inGraph.has(edge.targetFile)) continue;
      edges.push({
        from: `ui:${path}`,
        to: `ui:${edge.targetFile}`,
        label: '',
        kind: edge.isTypeOnly === true ? 'type' : 'import',
      });
    }
  }
}

function buildShellJourney(
  entry: ArchitectureFile,
  files: readonly ArchitectureFile[],
  screens: readonly OwnedScreenRoute[],
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
  sources: Map<string, SourceEntry>,
  graphs: ReadonlyMap<string, JourneyGraph>,
): { graph: JourneyGraph; actions: JourneyAction[] } {
  const reachable = new Set(renderedBy([entry.path], fileByPath, () => false).map((f) => f.path));
  const router = files.find(
    (file) => file.screenRoutes.length > 0 && (reachable.has(file.path) || file === entry),
  );
  const ownScreens =
    router === undefined ? [] : screens.filter((screen) => screen.owner === router.path);

  const alreadyDrawn = new Set(
    [...graphs.values()].flatMap((graph) =>
      graph.nodes.flatMap((node) =>
        node.id.startsWith('ui:') ? [node.id.slice('ui:'.length)] : [],
      ),
    ),
  );
  const uncoveredScreens = ownScreens
    .map((screen) => screen.componentFile)
    .filter((path): path is string => path !== null && !alreadyDrawn.has(path));

  const seeds = [
    entry.path,
    ...(router === undefined ? [] : [router.path]),
    ...new Set(uncoveredScreens),
  ];
  const nodes: GraphNode[] = seeds.flatMap((path) => {
    const file = fileByPath.get(path);
    return file === undefined ? [] : [compositionNode(file, sources)];
  });
  const edges: GraphEdge[] = [];
  for (const screen of ownScreens) {
    if (screen.componentFile === null) continue;
    const screenId = `screen:${screen.path}`;
    nodes.push({
      id: screenId,
      label: screen.path,
      kind: 'step-screen',
      detail: `${screen.component} renders at ${screen.path}`,
      group: 'screen',
      blueprints: [],
      followsBlueprints: [],
      fileCount: 0,
      layer: 'screen',
      icon: '\u{1F517}',
      lines: ['screen'],
    });
    edges.push({
      from: `ui:${router?.path ?? entry.path}`,
      to: screenId,
      label: 'routes to',
      kind: 'import',
    });
  }
  addComposition(nodes, edges, fileByPath, sources, shellFeatureId(entry));
  const featureId = shellFeatureId(entry);
  return {
    graph: { nodes: dedupeNodes(nodes), edges: dedupeEdges(edges) },
    actions: [
      {
        id: `${featureId}:open`,
        label: 'Open the application',
        hook: '',
        feature: featureId,
        method: '',
        path: ownScreens[0]?.path ?? '/',
        triggerCount: ownScreens.length,
        reaches: [],
      },
    ],
  };
}

function shellFeatureId(entry: ArchitectureFile): string {
  const segments = entry.path.split('/');
  const basename = segments.at(-1) ?? '';
  const parent = segments.at(-2) ?? '';
  const name = /^main\.tsx?$/.test(basename) ? parent : basename.replace(/\.tsx?$/, '');
  return name === 'src' || name === 'site' ? SHELL_FEATURE_ID : `${SHELL_FEATURE_ID} · ${name}`;
}

function frontEndEntries(
  files: readonly ArchitectureFile[],
  htmlEntries: readonly string[],
): ArchitectureFile[] {
  const named = files.filter((file) => htmlEntries.includes(file.path));
  const conventional = files.filter(
    (file) => file.container === 'site' && /\/main\.tsx?$/.test(file.path),
  );
  const found = [...new Set([...named, ...conventional])];
  if (found.length > 0) return found;
  return files.filter((file) => file.screenRoutes.length > 0);
}

function buildRequestJourney(
  files: readonly ArchitectureFile[],
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
  sources: Map<string, SourceEntry>,
): { graph: JourneyGraph; actions: JourneyAction[] } | null {
  const root = files.find((file) => file.container === 'api' && /\/src\/app\.ts$/.test(file.path));
  if (root === undefined) return null;
  const mounted = renderedBy([root.path], fileByPath, (file) => file.container !== 'api');
  const inGraph = new Set([root.path, ...mounted.map((file) => file.path)]);
  const nodes = [root, ...mounted].map((file) => compositionNode(file, sources));
  const edges: GraphEdge[] = [];
  for (const path of inGraph) {
    const file = fileByPath.get(path);
    if (file === undefined) continue;
    for (const edge of file.imports) {
      if (edge.targetFile === null || !inGraph.has(edge.targetFile)) continue;
      edges.push({
        from: `ui:${path}`,
        to: `ui:${edge.targetFile}`,
        label: '',
        kind: edge.isTypeOnly === true ? 'type' : 'import',
      });
    }
  }
  return {
    graph: { nodes: dedupeNodes(nodes), edges: dedupeEdges(edges) },
    actions: [
      {
        id: `${REQUEST_FEATURE_ID}:arrive`,
        label: 'Send any request',
        hook: '',
        feature: REQUEST_FEATURE_ID,
        method: '',
        path: '/api',
        triggerCount: 0,
        reaches: [],
      },
    ],
  };
}

export function buildJourneys(
  files: readonly ArchitectureFile[],
  htmlEntries: readonly string[] = [],
): JourneyModel {
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const sources = new Map<string, SourceEntry>();
  const screens = files.flatMap((file) =>
    file.screenRoutes.map((route) => ({ ...route, owner: file.path })),
  );
  const importersOf = new Map<string, string[]>();
  for (const file of files) {
    for (const edge of file.imports) {
      if (edge.targetFile === null) continue;
      importersOf.set(edge.targetFile, [...(importersOf.get(edge.targetFile) ?? []), file.path]);
    }
  }

  const routeOwner = new Map<string, { file: ArchitectureFile; symbol: string }[]>();
  const routeController = new Map<string, string>();
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
      routeController.set(identifier, `${file.path}:${route.line}`);
      const handlers = route.calls.flatMap((call) => {
        if (call.file === null) return [];
        const target = fileByPath.get(call.file);
        if (target === undefined || target.container !== 'api') return [];
        if (LAYERS_A_FLOW_DOES_NOT_START_AT.has(target.layer)) return [];
        return [{ file: target, symbol: call.name }];
      });
      routeOwner.set(identifier, [...(routeOwner.get(identifier) ?? []), ...handlers]);
    }
  }

  const features: JourneyFeature[] = [];
  const graphs = new Map<string, JourneyGraph>();

  const queryModules = files
    .filter((file) => file.layer === QUERY_LAYER)
    .sort((left, right) => left.path.localeCompare(right.path));

  for (const module of queryModules) {
    const featureId = fileLabel(module.path)
      .replace(QUERIES_SUFFIX, '')
      .replace(/\.tsx?$/, '');
    const actions: JourneyAction[] = [];
    const featureNodes: GraphNode[] = [];
    const featureEdges: GraphEdge[] = [];

    for (const exported of module.exports) {
      if (!exported.name.startsWith('use') || exported.apiCalls.length === 0) continue;
      const call = exported.apiCalls[0];
      if (call === undefined) continue;
      const actionId = `${featureId}:${exported.name}`;
      const isMutationHook = exported.source.includes('useMutation');
      const hookNodeId = `hook:${exported.name}`;
      const endpointId = `endpoint:${call.method} ${call.path}`;

      const triggers = files.filter(
        (file) =>
          file.container === 'site' &&
          file.layer !== QUERY_LAYER &&
          file.imports.some(
            (edge) => edge.targetFile === module.path && edge.namedBindings.includes(exported.name),
          ),
      );

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      for (const trigger of triggers) {
        for (const screen of screensReaching(trigger.path, screens, importersOf)) {
          const screenId = `screen:${screen.path}`;
          nodes.push({
            id: screenId,
            label: screen.path,
            kind: 'step-screen',
            detail: `${screen.component} renders at ${screen.path}`,
            group: 'screen',
            blueprints: [],
            followsBlueprints: [],
            fileCount: 0,
            layer: 'screen',
            icon: '\u{1F517}',
            lines: ['screen'],
          });
          if (screen.componentFile !== null && screen.componentFile !== trigger.path) {
            const pageId = `ui:${screen.componentFile}`;
            edges.push({ from: screenId, to: pageId, label: 'renders', kind: 'import' });
          } else {
            edges.push({
              from: screenId,
              to: `ui:${trigger.path}`,
              label: 'renders',
              kind: 'import',
            });
          }
        }
      }
      const screenComponentFiles = [
        ...new Set(
          triggers.flatMap((trigger) =>
            screensReaching(trigger.path, screens, importersOf)
              .map((screen) => screen.componentFile)
              .filter((path): path is string => path !== null),
          ),
        ),
      ];
      const drawnFiles = [
        ...new Map(
          [...triggers, ...screenComponentFiles.flatMap((path) => fileByPath.get(path) ?? [])].map(
            (file) => [file.path, file],
          ),
        ).values(),
      ];
      for (const page of drawnFiles) {
        for (const edge of page.imports) {
          if (edge.targetFile === null) continue;
          if (!drawnFiles.some((each) => each.path === edge.targetFile)) continue;
          edges.push({
            from: `ui:${page.path}`,
            to: `ui:${edge.targetFile}`,
            label: 'renders',
            kind: 'import',
          });
        }
      }

      for (const trigger of drawnFiles) {
        const componentName = componentLabel(trigger);
        const componentExport =
          trigger.exports.find((each) => each.name === componentName) ?? trigger.exports[0];
        const triggerKey = `ui:${trigger.path}`;
        const triggerBlueprint =
          [
            ...(componentExport?.blueprints ?? []),
            ...(componentExport?.followsBlueprints ?? []),
            ...trigger.blueprints,
            ...trigger.followsBlueprints,
          ][0] ?? '';
        if (componentExport !== undefined) {
          sources.set(
            triggerKey,
            sourceEntry(trigger.path, trigger.layer, triggerBlueprint, componentExport),
          );
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
          icon: LAYER_GROUP_ICON[trigger.layer] ?? '\u{1F5A5}',
          lines: [trigger.layer],
          ...(componentExport === undefined
            ? {}
            : {
                sourceKey: triggerKey,
                metrics: symbolMetrics(componentExport),
                chips: symbolChips(triggerBlueprint, componentExport),
              }),
        });
        if (!triggers.some((each) => each.path === trigger.path)) continue;
        const gestureNames = isMutationHook
          ? [
              ...new Set(
                trigger.gestures
                  .filter((gesture) => gesture.hook === exported.name)
                  .map((gesture) => gesture.event),
              ),
            ]
              .sort()
              .join(', ')
          : '';
        if (gestureNames === '') {
          edges.push({ from: triggerKey, to: hookNodeId, label: '', kind: 'import' });
          continue;
        }
        const gestureId = `gesture:${trigger.path}`;
        nodes.push({
          id: gestureId,
          label: gestureNames,
          kind: 'step-gesture',
          detail: `Handled in ${trigger.path}`,
          group: 'gesture',
          blueprints: [],
          followsBlueprints: [],
          fileCount: 0,
          layer: 'gesture',
          icon: '\u{1F446}',
          lines: ['user gesture'],
        });
        edges.push({ from: triggerKey, to: gestureId, label: '', kind: 'import' });
        edges.push({ from: gestureId, to: hookNodeId, label: 'calls', kind: 'import' });
      }

      const hookBlueprint = [...exported.blueprints, ...exported.followsBlueprints][0] ?? '';
      sources.set(hookNodeId, sourceEntry(module.path, module.layer, hookBlueprint, exported));
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
        metrics: symbolMetrics(exported),
        icon: LAYER_GROUP_ICON[module.layer] ?? '\u{1FA9D}',
        lines: [module.layer],
        chips: symbolChips(hookBlueprint, exported),
      });
      const declaredIn = routeController.get(`${call.method} ${call.path}`);
      nodes.push({
        id: endpointId,
        label: `${call.method} ${call.path}`,
        kind: 'step-endpoint',
        detail:
          declaredIn === undefined
            ? 'HTTP request, session cookie attached'
            : `Declared in ${declaredIn}`,
        group: 'endpoint',
        blueprints: [],
        followsBlueprints: [],
        fileCount: 0,
        layer: 'http',
        ...(declaredIn === undefined ? {} : { location: declaredIn }),
        icon: '\u{1F50C}',
        lines: ['HTTP endpoint'],
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
    addComposition(featureNodes, featureEdges, fileByPath, sources, featureId);
    graphs.set(`${featureId}:__all__`, {
      nodes: dedupeNodes(featureNodes),
      edges: dedupeEdges(featureEdges),
    });
    features.push({
      id: featureId,
      label: journeyLabel(featureId),
      actions: actions.sort((left, right) => left.label.localeCompare(right.label)),
      overview: true,
    });
  }

  for (const entry of frontEndEntries(files, htmlEntries)) {
    const shell = buildShellJourney(entry, files, screens, fileByPath, sources, graphs);
    const featureId = shellFeatureId(entry);
    for (const action of shell.actions) graphs.set(action.id, shell.graph);
    features.unshift({
      id: featureId,
      label: journeyLabel(featureId),
      actions: shell.actions,
      overview: false,
    });
  }

  const request = buildRequestJourney(files, fileByPath, sources);
  if (request !== null) {
    for (const action of request.actions) graphs.set(action.id, request.graph);
    features.push({
      id: REQUEST_FEATURE_ID,
      label: journeyLabel(REQUEST_FEATURE_ID),
      actions: request.actions,
      overview: false,
    });
  }

  const shared = files.filter((file) => isFrontEndModule(file) && file.feature === null);
  if (shared.length > 0) {
    const sharedPaths = new Set(shared.map((file) => file.path));
    const sharedNodes = shared.map((file) => compositionNode(file, sources));
    const sharedEdges: GraphEdge[] = [];
    for (const file of shared) {
      for (const edge of file.imports) {
        if (edge.targetFile === null || !sharedPaths.has(edge.targetFile)) continue;
        sharedEdges.push({
          from: `ui:${file.path}`,
          to: `ui:${edge.targetFile}`,
          label: '',
          kind: edge.isTypeOnly === true ? 'type' : 'import',
        });
      }
    }
    const sharedGraph = { nodes: dedupeNodes(sharedNodes), edges: dedupeEdges(sharedEdges) };
    graphs.set(`${SHARED_FEATURE_ID}:__all__`, sharedGraph);
    features.push({
      id: SHARED_FEATURE_ID,
      label: journeyLabel(SHARED_FEATURE_ID),
      actions: [],
      overview: true,
    });
  }

  const drawnFiles = new Set(
    [...graphs.values()].flatMap((graph) =>
      graph.nodes.flatMap((node) => {
        if (node.sourceKey !== undefined && node.sourceKey.startsWith('ui:')) {
          return [node.sourceKey.slice('ui:'.length)];
        }
        return filePathOf(node.location);
      }),
    ),
  );
  return { features, graphs, sources, drawnFiles };
}
