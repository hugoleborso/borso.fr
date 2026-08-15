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
}

export interface JourneyGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

const QUERIES_SUFFIX = '.queries.ts';
const QUERY_LAYER = 'query';
const MAXIMUM_WALK_DEPTH = 6;
/** A bound on the upward walk, so a cycle in the import graph cannot spin. */
const MAXIMUM_SCREEN_WALK_STEPS = 500;

/**
 * `useAppendSetlistEntry` reads as `Append setlist entry`.
 *
 * A read hook is named for what it returns rather than for what it does, so
 * `useBarsList` came out as `Bars list` — a noun where every other action is a
 * verb. The trailing word that names the shape of the result moves to the front
 * as the verb it implies, which is what a person would say they did.
 */
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

/** The component name a file exports, for a node label. */
function componentLabel(file: ArchitectureFile): string {
  const base = fileLabel(file.path).replace(/\.(tsx|ts)$/, '');
  return base;
}

/** A screen, plus the router module that declared it. */
interface OwnedScreenRoute extends ScreenRoute {
  readonly owner: string;
}

interface WalkResult {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

/**
 * The screens whose page component reaches a file through imports.
 *
 * Walked upward rather than down: a component knows nothing about who renders
 * it, so the only way from a button back to an address is to follow importers
 * until one of them is a page the router names.
 */
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

/**
 * Every front-end module a set of screens renders, transitively.
 *
 * A flow answers "what happens when I click this". It does not answer "what is
 * this screen made of", and the difference is most of the front end: an atom is
 * in no data flow by construction, so a level that only walks flows accounts
 * for a quarter of the tree and reports the rest as unreached — which reads as
 * dead code rather than as a question the level never asked.
 */
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

/** A block for a module a screen renders or leans on, rather than one a flow passes through. */
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

/** The pills a function block prints: its pattern, its size, its shape. */
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

/** The schema module declaring a Drizzle table, and the declaration itself. */
function tableDeclaration(
  table: string,
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
): { file: ArchitectureFile; symbol: ExportedSymbol } | undefined {
  for (const file of fileByPath.values()) {
    if (file.layer !== 'schema') continue;
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
    // The block is the Drizzle declaration, so it opens that file and counts as
    // drawn. Without this the schema modules every flow ends in read as covered
    // by nothing.
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
  /** The same file as the base revision had it, on a diff page, when it changed. */
  readonly baseCode?: string;
  readonly lines: number;
  readonly complexity: number;
  readonly disables: number;
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
  /** Every file some action's graph draws, which is this level's coverage. */
  readonly drawnFiles: ReadonlySet<string>;
}

/** The journey that is not a data flow: opening the application at all. */
const SHELL_FEATURE_ID = 'shell';
/** The other one: a request arriving, before any route has been chosen. */
const REQUEST_FEATURE_ID = 'request';

/** True for a module the front end renders or leans on, rather than one the API owns. */
function isFrontEndModule(file: ArchitectureFile): boolean {
  return file.container === 'site' || file.container === 'domain';
}

/**
 * Draw what the blocks already in a feature graph are made of.
 *
 * The flow through a feature names its pages, its hooks and its back end. The
 * feature is also every component those pages render and every pure helper they
 * lean on, and none of that appears in a flow — an atom is in no data flow by
 * construction. Adding it here rather than to each action keeps a single action
 * readable and lets the feature's own view answer "what is this made of".
 */
/**
 * A node's `location` is `<path>:<line>`, and only the path names a file. The
 * line half must not reach a set of drawn files: it would never match a real
 * path, so it costs nothing, and it reads as a bug every time.
 */
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

  const rendered = renderedBy(seeds, fileByPath, (file) => !isFrontEndModule(file));
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

/**
 * The frame every address renders inside, as its own journey.
 *
 * Opening the application is something a person does, and what answers is the
 * shell: the session gate, the offline banner, the tab bar that is the only way
 * to reach most addresses. None of it sits behind a query hook, so a level
 * built purely from data flows never draws it, and the navigation the whole
 * product hangs off reads as unreached code.
 */
function buildShellJourney(
  entry: ArchitectureFile,
  files: readonly ArchitectureFile[],
  screens: readonly OwnedScreenRoute[],
  fileByPath: ReadonlyMap<string, ArchitectureFile>,
  sources: Map<string, SourceEntry>,
  graphs: ReadonlyMap<string, JourneyGraph>,
): { graph: JourneyGraph; actions: JourneyAction[] } {
  // The router this entry renders, when it has one. A site without client-side
  // routing has one address and no screen list, and its shell is simply
  // everything the entry module puts on the page.
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
  // A screen no feature covers still has an address and still renders
  // something; without it the level would leave a whole page unaccounted for
  // because nobody wired a query to it yet.
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
  addComposition(nodes, edges, fileByPath, sources);
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

/**
 * One shell per front-end entry module.
 *
 * A repository can hold several small sites in one workspace, each with its own
 * entry and its own page, and naming them all `shell` would draw them as one
 * application that does not exist.
 */
function shellFeatureId(entry: ArchitectureFile): string {
  const segments = entry.path.split('/');
  const basename = segments.at(-1) ?? '';
  const parent = segments.at(-2) ?? '';
  // A conventional entry is named for nothing, so its folder names it. A page
  // that is its own script names itself — two entries in one folder would
  // otherwise claim the same journey and the second would silently replace the
  // first.
  const name = /^main\.tsx?$/.test(basename) ? parent : basename.replace(/\.tsx?$/, '');
  return name === 'src' || name === 'site' ? SHELL_FEATURE_ID : `${SHELL_FEATURE_ID} · ${name}`;
}

/**
 * The modules a browser starts at.
 *
 * Three shapes, in the order they are looked for: the modules an `index.html`
 * names in a `<script type="module">`, which is the only authority a page
 * without a bundler entry convention has; a `main.tsx` beside the sources; and
 * failing both, whatever declares the routes. A site whose page is a plain
 * script had its entry read as an ordinary module, so nothing rooted a journey
 * there and the page's own code reported as unreached.
 */
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

/**
 * Where a request lands before it is a route: the API's own composition root.
 *
 * Every flow starts at an endpoint, which hides the fact that something mounted
 * that endpoint, applied a gate to it and handed it a database client. That
 * module and what it pulls in — the middleware, the schema barrel, the slice
 * mounted only when a flag is set — sit above every journey and inside none, so
 * a level built from flows alone reports the composition root of the back end
 * as code nothing reaches.
 */
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
  /**
   * The controller module each route is declared in.
   *
   * The endpoint block *is* that handler, so without this the file the walk
   * reads the route from is drawn on every flow and counted on none.
   */
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

  // The layer rather than the suffix. Both name the same modules once an
  // application has been renamed, but an application that has not yet been
  // reported no user action at all while its query modules sat in plain sight
  // — and the level still headlined a coverage figure, which reads as "we
  // looked" rather than as "we could not look".
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

      // A flow that starts at a component starts nowhere a person recognises.
      // Each trigger is walked back up the import graph to the screens that can
      // reach it, so the first block is an address the reader can type.
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
      // The page is drawn as a trigger of its own when it is not one already,
      // so the chain from the address to the component holding the gesture is
      // continuous rather than jumping over whatever sits between.
      const pageFiles = [
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
          [...triggers, ...pageFiles.flatMap((path) => fileByPath.get(path) ?? [])].map((file) => [
            file.path,
            file,
          ]),
        ).values(),
      ];
      // A page that reaches the hook through another component gets the edge to
      // that component rather than to the hook, so the middle of the chain is
      // visible instead of skipped.
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
        // The component that triggers the action is a file rather than one
        // function, so the block opens whichever export carries the file's own
        // name — the component itself — and falls back to the first export when
        // the two do not match.
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
        // The gesture is the JSX attribute the hook's binding sits under. It is
        // the one part of "what the user did" the tree actually records.
        // Only a write gets a gesture block. A read hook's data reaches a
        // handler too — a list feeding an `onSelect` — and drawing that as
        // something the person did would be a claim the code does not make.
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
    addComposition(featureNodes, featureEdges, fileByPath, sources);
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

  for (const entry of frontEndEntries(files, htmlEntries)) {
    const shell = buildShellJourney(entry, files, screens, fileByPath, sources, graphs);
    const featureId = shellFeatureId(entry);
    graphs.set(`${featureId}:__all__`, shell.graph);
    // The single action is the whole journey, so both entries answer with the
    // same graph rather than one of them selecting nothing.
    for (const action of shell.actions) graphs.set(action.id, shell.graph);
    features.unshift({ id: featureId, label: featureId, actions: shell.actions });
  }

  const request = buildRequestJourney(files, fileByPath, sources);
  if (request !== null) {
    graphs.set(`${REQUEST_FEATURE_ID}:__all__`, request.graph);
    for (const action of request.actions) graphs.set(action.id, request.graph);
    features.push({
      id: REQUEST_FEATURE_ID,
      label: REQUEST_FEATURE_ID,
      actions: request.actions,
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
