/**
 * Assembles pragma's architecture graph and writes the browsable page.
 *
 * Run `pnpm exec tsx scripts/architecture/architecture-graph.ts` to regenerate,
 * and add `--check` to fail when the committed output is stale or when the
 * manifest and the code disagree about which external systems exist.
 *
 * The five levels this emits are the four C4 levels plus one between component
 * and code. Level 3.5 exists because component is too coarse to trust and code
 * is too fine to read: it walks one bounded context end to end, from the HTTP
 * route through the service and repository functions to the tables and external
 * systems, and on the front from the calling module through the query hook to
 * the endpoint it reaches. It is the level at which a reader can decide whether
 * a slice does what its name claims without opening a file.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { buildJourneys, type SourceEntry } from './architecture-journeys';
import { type LevelLayout, layoutLevel } from './architecture-layout';
import { renderArchitectureIndex, renderArchitecturePage } from './architecture-page';
import {
  type ArchitectureFile,
  type NodeMetrics,
  aggregateMetrics,
  buildArchitectureFile,
  isTestFile,
  readApiPathStrings,
} from './architecture-model';
import {
  BLUEPRINT_ICON,
  COMPLEXITY_ICON,
  DISABLE_ICON,
  FILE_ICON,
  LAYER_GROUP_ICON,
  ROUTE_ICON,
  SIZE_ICON,
} from './architecture-icons';
import {
  ARCHITECTURE_MANIFESTS,
  type ArchitectureManifest,
  manifestFor,
} from './architecture-manifest';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIRECTORY = join(REPOSITORY_ROOT, 'docs/architecture');
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'cdk.out', '.git', '__fixtures__']);
const SOURCE_PATTERN = /\.tsx?$/;
/**
 * The repository a commit link points at. Read from a constant rather than from
 * `git remote`, because a fork's remote would change every emitted page and the
 * `--check` gate compares exact bytes.
 */
const REPOSITORY_SLUG = 'hugoleborso/borso.fr';
/** Lines of a file the modal shows before it stops. */
const MAXIMUM_MODAL_LINES = 400;

/** The standard documents in a directory, or none when it is not there. */
function listStandardFileNames(directory: string): string[] {
  try {
    return readdirSync(directory)
      .filter((name) => name.endsWith('.md') && name !== 'README.md')
      .sort();
  } catch {
    return [];
  }
}

/** The files under a directory, or none when the directory is not there. */
function listSourceFilesOrEmpty(directory: string): string[] {
  try {
    return listSourceFiles(directory);
  } catch {
    return [];
  }
}

export interface FileHistory {
  readonly commits: number;
  readonly sha: string;
  readonly date: string;
  readonly subject: string;
}

/**
 * When a file last changed, and how often, so a pattern can be read as current
 * or as something nobody has touched since it was written.
 */
function readFileHistory(repositoryRelativePath: string, root: string): FileHistory | null {
  try {
    const last = execFileSync(
      'git',
      ['log', '--format=%h|%ad|%s', '--date=short', '-1', '--', repositoryRelativePath],
      { cwd: root, encoding: 'utf8' },
    ).trim();
    if (last === '') return null;
    const [sha = '', date = '', ...subject] = last.split('|');
    const commits = execFileSync(
      'git',
      ['rev-list', '--count', 'HEAD', '--', repositoryRelativePath],
      { cwd: root, encoding: 'utf8' },
    ).trim();
    return { commits: Number(commits), sha, date, subject: subject.join('|') };
  } catch {
    return null;
  }
}

export interface StandardEntry {
  readonly path: string;
  readonly title: string;
  readonly rule: string;
}

/**
 * The written rules, listed beside the patterns.
 *
 * A blueprint says which example to copy and a standard says what the rule is;
 * the page carried the first and not the second, which left the map showing the
 * shape of the code with no way to reach the reason it has that shape.
 */
function listStandards(root: string): StandardEntry[] {
  const directory = 'docs/standards';
  const names = listStandardFileNames(join(root, directory));
  return names.map((name) => {
    const path = `${directory}/${name}`;
    const text = readSourceOrEmpty(path, root);
    const lines = text.split('\n');
    const title = (lines[0] ?? name).replace(/^#\s*/, '');
    const ruleIndex = lines.findIndex((line) => line.trim() === '## Rule');
    const rule =
      ruleIndex === -1
        ? ''
        : (lines.slice(ruleIndex + 1).find((line) => line.trim() !== '') ?? '').trim();
    return { path, title, rule };
  });
}

/** A file's own source, for the modal, with a cap so a long one stays readable. */
function readCappedSource(repositoryRelativePath: string, root: string): string {
  const text = readSourceOrEmpty(repositoryRelativePath, root);
  const lines = text.split('\n');
  if (lines.length <= MAXIMUM_MODAL_LINES) return text;
  return `${lines.slice(0, MAXIMUM_MODAL_LINES).join('\n')}\n\n// … ${lines.length - MAXIMUM_MODAL_LINES} more lines, see the file`;
}

/** File contents, or the empty string when the file is not there yet. */
function readSourceOrEmpty(repositoryRelativePath: string, root: string = REPOSITORY_ROOT): string {
  try {
    return readFileSync(join(root, repositoryRelativePath), 'utf8');
  } catch {
    return '';
  }
}

function listSourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      found.push(...listSourceFiles(join(directory, entry.name)));
      continue;
    }
    if (!SOURCE_PATTERN.test(entry.name)) continue;
    found.push(join(directory, entry.name));
  }
  return found;
}

export interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly detail: string;
  readonly group: string | null;
  readonly blueprints: readonly string[];
  readonly followsBlueprints: readonly string[];
  readonly fileCount: number;
  /** The layer this node's code sits in, shown on the block itself. */
  readonly layer?: string;
  /** `path:line`, so a reader can open the real thing. */
  readonly location?: string;
  /** Key into the shared source map, when this node is a function. */
  readonly sourceKey?: string;
  /** Size and shape of the code behind this node. */
  readonly metrics?: NodeMetrics;
  /** Emoji drawn before the name, so a block is sorted before it is read. */
  readonly icon?: string;
  /** Plain rows printed under the name. */
  readonly lines?: readonly string[];
  /** Pills printed under the rows: blueprint, size, complexity. */
  readonly chips?: readonly NodeChip[];
}

export interface NodeChip {
  readonly icon: string;
  readonly text: string;
  /** Drives the pill's colour, and is a class name in the page. */
  readonly tone: 'plain' | 'blueprint' | 'complexity' | 'size' | 'warn';
}

/**
 * The pills a block prints for the code behind it.
 *
 * `total` distinguishes a sum from a reading of one function: a container
 * showing `cx 2313` is the complexity of everything inside it added up, which
 * says nothing about any one file, and a block that does not say so invites the
 * number to be read as a single measurement.
 */
function metricChips(metrics: NodeMetrics, isAggregate: boolean): NodeChip[] {
  const suffix = isAggregate ? ' total' : '';
  return [
    { icon: SIZE_ICON, text: `${metrics.lines} lines${suffix}`, tone: 'size' },
    { icon: COMPLEXITY_ICON, text: `cx ${metrics.complexity}${suffix}`, tone: 'complexity' },
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

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly kind: string;
}

export interface GraphLevel {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

const CONTAINER_BY_SOURCE: Readonly<Record<string, string>> = {
  site: 'site',
  api: 'api',
  domain: 'domain',
  cdk: 'infrastructure',
};

function containerIdOf(file: ArchitectureFile): string {
  return CONTAINER_BY_SOURCE[file.container] ?? file.container;
}

export interface LayerCoverage {
  readonly layer: string;
  readonly covered: number;
  readonly total: number;
}

export interface LevelCoverage {
  readonly levelId: string;
  /** What being drawn by this level means, so the number can be read. */
  readonly rule: string;
  readonly byLayer: readonly LayerCoverage[];
  readonly uncovered: readonly string[];
}

/**
 * How much of the codebase a level actually draws, per layer.
 *
 * A level that shows everything says so in one line, and one that does not
 * lists what it left out. The distinction matters most at 3.5, where a file no
 * user action reaches is either dead or the back end of a feature with no front
 * end — and nothing on the page said which files those were.
 */
function buildLevelCoverage(
  levelId: string,
  rule: string,
  files: readonly ArchitectureFile[],
  isCovered: (file: ArchitectureFile) => boolean,
): LevelCoverage {
  const byLayer = new Map<string, { covered: number; total: number }>();
  const uncovered: string[] = [];
  for (const file of files) {
    const entry = byLayer.get(file.layer) ?? { covered: 0, total: 0 };
    entry.total += 1;
    if (isCovered(file)) entry.covered += 1;
    else uncovered.push(file.path);
    byLayer.set(file.layer, entry);
  }
  return {
    levelId,
    rule,
    byLayer: [...byLayer.entries()]
      .map(([layer, counts]) => ({ layer, ...counts }))
      .sort((left, right) => left.layer.localeCompare(right.layer)),
    uncovered: uncovered.sort(),
  };
}

function uniqueEdges(edges: readonly GraphEdge[]): GraphEdge[] {
  const seen = new Map<string, GraphEdge>();
  for (const edge of edges) {
    seen.set(`${edge.from}->${edge.to}|${edge.kind}|${edge.label}`, edge);
  }
  return [...seen.values()];
}

function validateExternals(
  files: readonly ArchitectureFile[],
  manifest: ArchitectureManifest,
): string[] {
  const declared = new Set(manifest.externals.map((each) => each.id));
  const referenced = new Set(files.flatMap((file) => file.dependsOnExternal));
  const problems: string[] = [];
  for (const external of referenced) {
    if (!declared.has(external)) {
      const owner = files.find((file) => file.dependsOnExternal.includes(external));
      problems.push(
        `@DependsOnExternal ${external} in ${owner?.path ?? 'unknown file'} names an external system the manifest does not declare.`,
      );
    }
  }
  for (const external of declared) {
    if (!referenced.has(external)) {
      problems.push(
        `The manifest declares the external system ${external}, and no file carries @DependsOnExternal ${external}.`,
      );
    }
  }
  return problems;
}

/** What "outside" means for each kind of external, spelled out on the block. */
const BOUNDARY_LABEL: Readonly<Record<string, string>> = {
  'third-party': 'a third party',
  aws: 'an AWS service this account owns',
  'browser-platform': 'a browser API',
};

function buildContextLevel(
  files: readonly ArchitectureFile[],
  manifest: ArchitectureManifest,
): GraphLevel {
  const referenced = new Set(files.flatMap((file) => file.dependsOnExternal));
  const systemMetrics = aggregateMetrics(files);
  const nodes: GraphNode[] = [
    ...manifest.actors.map((actor) => ({
      id: actor.id,
      label: actor.name,
      kind: 'actor',
      detail: actor.description,
      group: 'people',
      blueprints: [],
      followsBlueprints: [],
      fileCount: 0,
      icon: actor.icon,
      lines: ['outside the system'],
    })),
    {
      id: 'system',
      label: manifest.name,
      kind: 'system',
      detail: manifest.description,
      group: 'system',
      blueprints: [],
      followsBlueprints: [],
      fileCount: files.length,
      metrics: systemMetrics,
      icon: '🎯',
      lines: ['inside — this repository builds it'],
      chips: [
        { icon: FILE_ICON, text: `${files.length} files`, tone: 'plain' },
        ...metricChips(systemMetrics, true),
      ],
    },
    ...manifest.externals
      .filter((external) => referenced.has(external.id))
      .map((external) => ({
        id: external.id,
        label: external.name,
        kind: `external-${external.boundary}`,
        detail: `${external.technology}. ${external.description}`,
        group: external.boundary,
        blueprints: [],
        followsBlueprints: [],
        fileCount: files.filter((file) => file.dependsOnExternal.includes(external.id)).length,
        icon: external.icon,
        lines: [`outside — ${BOUNDARY_LABEL[external.boundary]}`, external.technology],
        chips: [
          {
            icon: FILE_ICON,
            text: `reached from ${files.filter((file) => file.dependsOnExternal.includes(external.id)).length} files`,
            tone: 'plain' as const,
          },
        ],
      })),
  ];

  const edges: GraphEdge[] = [
    ...manifest.actors.map((actor) => ({
      from: actor.id,
      to: 'system',
      label: 'uses',
      kind: 'uses',
    })),
    ...manifest.externals
      .filter((external) => referenced.has(external.id))
      .map((external) => ({
        from: 'system',
        to: external.id,
        label: external.technology,
        kind: 'depends',
      })),
  ];
  return {
    id: 'context',
    title: 'Level 1 — Context',
    summary:
      'Who uses the system and what it depends on. Every external here is declared in the manifest and referenced by at least one @DependsOnExternal tag in the code; the generator fails if either half is missing.',
    nodes,
    edges,
  };
}

function buildContainerLevel(
  files: readonly ArchitectureFile[],
  manifest: ArchitectureManifest,
): GraphLevel {
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const containerIds = new Set(manifest.containers.map((each) => each.id));
  const externalById = new Map(manifest.externals.map((each) => [each.id, each]));

  const nodes: GraphNode[] = manifest.containers.map((container) => {
    const owned = files.filter((file) => containerIdOf(file) === container.id);
    const metrics = aggregateMetrics(owned);
    return {
      id: container.id,
      label: container.name,
      kind: `container-${container.runtime}`,
      detail: `${container.technology}. ${container.description}`,
      group: container.runtime,
      blueprints: owned.flatMap((file) => file.blueprints),
      followsBlueprints: owned.flatMap((file) => file.followsBlueprints),
      fileCount: owned.length,
      metrics,
      icon: container.icon,
      lines: [
        container.technology,
        ...(container.hosting === undefined ? [] : [container.hosting]),
      ],
      chips:
        owned.length === 0
          ? [{ icon: FILE_ICON, text: 'no source in this repository', tone: 'plain' as const }]
          : [
              { icon: FILE_ICON, text: `${metrics.files} files`, tone: 'plain' as const },
              ...metricChips(metrics, true),
            ],
    };
  });

  const externalNodes: GraphNode[] = manifest.externals
    .filter((external) => external.realisedBy === undefined)
    .filter((external) => files.some((file) => file.dependsOnExternal.includes(external.id)))
    .map((external) => ({
      id: external.id,
      label: external.name,
      kind: `external-${external.boundary}`,
      detail: `${external.technology}. ${external.description}`,
      group: external.boundary,
      blueprints: [],
      followsBlueprints: [],
      fileCount: 0,
      icon: external.icon,
      lines: [`outside — ${BOUNDARY_LABEL[external.boundary] ?? external.boundary}`],
    }));

  const edges: GraphEdge[] = [];
  for (const file of files) {
    const from = containerIdOf(file);
    for (const edge of file.imports) {
      if (edge.targetFile === null) continue;
      const target = fileByPath.get(edge.targetFile);
      if (target === undefined) continue;
      const to = containerIdOf(target);
      if (to === from || !containerIds.has(to)) continue;
      edges.push({
        from,
        to,
        label: edge.isTypeOnly ? 'compiles against' : 'imports',
        kind: edge.isTypeOnly ? 'type' : 'import',
      });
    }
    for (const external of file.dependsOnExternal) {
      const declared = externalById.get(external);
      const to = declared?.realisedBy ?? external;
      edges.push({
        from,
        to,
        label: declared?.technology ?? '',
        kind: 'depends',
      });
    }
  }
  if (
    files.some((file) => file.apiCalls.length > 0) &&
    containerIds.has('site') &&
    containerIds.has('api')
  ) {
    edges.push({
      from: 'site',
      to: 'api',
      label: 'JSON over HTTPS, typed by the router',
      kind: 'http',
    });
  }

  return {
    id: 'container',
    title: 'Level 2 — Containers',
    summary:
      'The deployable and build-time units, and how they reach each other. Import edges are real module imports; the HTTP edge exists because front-end modules call the typed client.',
    nodes: [...nodes, ...externalNodes],
    edges: uniqueEdges(edges),
  };
}

/** The folder a group of files shares, which is what names the block. */
function commonFolder(files: readonly ArchitectureFile[], applicationPrefix: string): string {
  const folders = files.map((file) => file.path.split('/').slice(0, -1));
  const first = folders[0] ?? [];
  let shared = first.length;
  for (const folder of folders) {
    let index = 0;
    while (index < shared && folder[index] === first[index]) index += 1;
    shared = index;
  }
  return `${first.slice(0, shared).join('/')}/`.replace(applicationPrefix, '');
}

function buildComponentLevel(
  files: readonly ArchitectureFile[],
  manifest: ArchitectureManifest,
): GraphLevel {
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const componentIdOf = (file: ArchitectureFile): string =>
    `${containerIdOf(file)}::${file.feature ?? file.context}`;

  const grouped = new Map<string, ArchitectureFile[]>();
  for (const file of files) {
    const id = componentIdOf(file);
    grouped.set(id, [...(grouped.get(id) ?? []), file]);
  }

  const containerName = new Map(manifest.containers.map((each) => [each.id, each.name]));
  // A context is named after its folder, and `root` or `lib` occurs under more
  // than one container. Two blocks reading `root` is the diagram failing to say
  // which is which, so the container joins the name where the name repeats.
  const nameCount = new Map<string, number>();
  for (const id of grouped.keys()) {
    const name = id.split('::')[1] ?? id;
    nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
  }
  const applicationPrefix = `apps/${manifest.application}/`;
  const nodes: GraphNode[] = [...grouped.entries()].map(([id, owned]) => {
    const [containerId, contextName] = id.split('::');
    const layers = [...new Set(owned.map((file) => file.layer))].sort();
    const routeCount = owned.reduce((total, file) => total + file.routes.length, 0);
    const metrics = aggregateMetrics(owned);
    const name = contextName ?? id;
    const blueprintIds = [
      ...new Set(owned.flatMap((file) => [...file.blueprints, ...file.followsBlueprints])),
    ].sort();
    return {
      id,
      label: (nameCount.get(name) ?? 0) > 1 ? `${containerId} · ${name}` : name,
      kind: `component-${containerId ?? 'unknown'}`,
      detail: `${owned.length} files in ${containerName.get(containerId ?? '') ?? containerId}. Layers: ${layers.join(', ')}.${
        routeCount > 0 ? ` ${routeCount} HTTP routes.` : ''
      }`,
      group: containerId ?? null,
      blueprints: owned.flatMap((file) => file.blueprints),
      followsBlueprints: owned.flatMap((file) => file.followsBlueprints),
      fileCount: owned.length,
      metrics,
      icon: LAYER_GROUP_ICON[layers[0] ?? ''] ?? '📁',
      lines: [commonFolder(owned, applicationPrefix), layers.join(', ')],
      chips: [
        { icon: FILE_ICON, text: `${metrics.files} files`, tone: 'plain' },
        ...(routeCount > 0
          ? [{ icon: ROUTE_ICON, text: `${routeCount} routes`, tone: 'plain' as const }]
          : []),
        ...metricChips(metrics, true),
        ...blueprintIds.map((each) => ({
          icon: BLUEPRINT_ICON,
          text: each,
          tone: 'blueprint' as const,
        })),
      ],
    };
  });

  const edges: GraphEdge[] = [];
  for (const file of files) {
    const from = componentIdOf(file);
    for (const edge of file.imports) {
      if (edge.targetFile === null) continue;
      const target = fileByPath.get(edge.targetFile);
      if (target === undefined) continue;
      const to = componentIdOf(target);
      if (to === from) continue;
      edges.push({ from, to, label: '', kind: edge.isTypeOnly ? 'type' : 'import' });
    }
  }
  return {
    id: 'component',
    title: 'Level 3 — Components',
    summary:
      'Bounded contexts on the back and feature areas on the front, with the import edges between them. A back-end context is a folder under api/src; a front-end one is a @Feature tag, falling back to the folder. A column is depth in the import graph, not a layer: two contexts of the same shape sit in different columns when one is reached through more hops than the other, and nothing can be read from the horizontal position beyond what the arrows already say.',
    nodes,
    edges: uniqueEdges(edges),
  };
}

export interface SliceStep {
  readonly layer: string;
  readonly label: string;
  readonly file: string;
  readonly line: number;
  readonly detail: string;
}

export interface SliceRoute {
  readonly method: string;
  readonly path: string;
  readonly file: string;
  readonly line: number;
  readonly steps: readonly SliceStep[];
  readonly tables: readonly string[];
  readonly externals: readonly string[];
  readonly callers: readonly string[];
  /** Modules naming this path as a URL string rather than through the client. */
  readonly urlCallers: readonly string[];
}

export interface ContextSlice {
  readonly id: string;
  readonly context: string;
  readonly mountPath: string | null;
  readonly routes: readonly SliceRoute[];
  readonly files: readonly { path: string; layer: string; lineCount: number }[];
}

/**
 * Walk one back-end bounded context from its HTTP routes down to the tables and
 * external systems each one reaches, and record which front-end modules call it.
 */
function buildSlices(
  files: readonly ArchitectureFile[],
  extraUrlSources: ReadonlyMap<string, readonly string[]>,
): ContextSlice[] {
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const apiFiles = files.filter((file) => file.container === 'api');
  const compositionRoot = files.find((file) => file.path.endsWith('/api/src/app.ts'));
  const mountByRouter = new Map<string, string>();
  for (const mount of compositionRoot?.mounts ?? []) {
    if (mount.targetFile === null) continue;
    mountByRouter.set(`${mount.targetFile}#${mount.routerFactory}`, mount.basePath);
  }

  const callersByPath = new Map<string, string[]>();
  for (const file of files) {
    for (const call of file.apiCalls) {
      const key = `${call.method} ${call.path}`;
      const existing = callersByPath.get(key) ?? [];
      callersByPath.set(key, [...existing, `${file.path}:${call.line}`]);
    }
  }

  const urlCallersByPath = new Map<string, string[]>();
  for (const [path, urls] of [
    ...files.map((file) => [file.path, file.urlStrings] as const),
    ...extraUrlSources,
  ]) {
    for (const url of urls) {
      urlCallersByPath.set(url, [...(urlCallersByPath.get(url) ?? []), path]);
    }
  }

  const contexts = [...new Set(apiFiles.map((file) => file.context))].sort();
  const slices: ContextSlice[] = [];

  for (const context of contexts) {
    const owned = apiFiles.filter((file) => file.context === context);
    const mountPath =
      owned
        .filter((file) => file.layer === 'controller')
        .flatMap((file) =>
          file.routes.map((route) => mountByRouter.get(`${file.path}#${route.routerVariable}`)),
        )
        .find((basePath) => basePath !== undefined) ?? null;

    const routes: SliceRoute[] = [];
    for (const controllerFile of owned.filter((file) => file.layer === 'controller')) {
      for (const route of controllerFile.routes) {
        const steps: SliceStep[] = [];
        const tables = new Set<string>();
        const externals = new Set<string>();
        const visited = new Set<string>();

        const walk = (symbolName: string, filePath: string, depth: number): void => {
          const key = `${filePath}#${symbolName}`;
          if (visited.has(key) || depth > 6) return;
          visited.add(key);
          const target = fileByPath.get(filePath);
          if (target === undefined) return;
          const exported = target.exports.find((each) => each.name === symbolName);
          if (exported === undefined) return;
          for (const external of exported.dependsOnExternal) externals.add(external);
          for (const table of exported.tables) tables.add(table);
          steps.push({
            layer: target.layer,
            label: symbolName,
            file: target.path,
            line: exported.line,
            detail: target.layer,
          });
          for (const call of exported.callSymbols) {
            if (call.file === null) continue;
            walk(call.name, call.file, depth + 1);
          }
        };

        for (const call of route.calls) {
          if (call.file === null) continue;
          walk(call.name, call.file, 0);
        }

        const basePath =
          mountByRouter.get(`${controllerFile.path}#${route.routerVariable}`) ?? null;
        const fullPath =
          basePath === null
            ? route.path
            : `${basePath}${route.path === '/' ? '' : route.path}`.replace(/\/+/g, '/');
        routes.push({
          method: route.method,
          path: fullPath,
          file: controllerFile.path,
          line: route.line,
          steps,
          tables: [...tables],
          externals: [...externals],
          callers: callersByPath.get(`${route.method} ${fullPath}`) ?? [],
          urlCallers: (urlCallersByPath.get(fullPath) ?? []).filter(
            (caller) => !caller.startsWith('apps/pragma/api/'),
          ),
        });
      }
    }

    slices.push({
      id: `api::${context}`,
      context,
      mountPath,
      routes,
      files: owned.map((file) => ({
        path: file.path,
        layer: file.layer,
        lineCount: file.lineCount,
      })),
    });
  }
  return slices;
}

function buildCodeLevel(files: readonly ArchitectureFile[]): GraphLevel {
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const nodes: GraphNode[] = files.map((file) => ({
    id: file.path,
    label: file.path.split('/').pop() ?? file.path,
    kind: `layer-${file.layer}`,
    detail: `${file.layer} · ${file.lineCount} lines · ${file.exports.length} exports`,
    group: `${containerIdOf(file)}::${file.feature ?? file.context}`,
    blueprints: file.blueprints,
    followsBlueprints: file.followsBlueprints,
    fileCount: 1,
  }));
  const edges: GraphEdge[] = [];
  for (const file of files) {
    for (const edge of file.imports) {
      if (edge.targetFile === null || !fileByPath.has(edge.targetFile)) continue;
      edges.push({
        from: file.path,
        to: edge.targetFile,
        label: '',
        kind: edge.isTypeOnly ? 'type' : 'import',
      });
    }
  }
  return {
    id: 'code',
    title: 'Level 4 — Code',
    summary:
      'Every source file and every import between them. Filter by container and layer; the graph is the real module graph, not a drawing of it.',
    nodes,
    edges: uniqueEdges(edges),
  };
}

export interface BlueprintEntry {
  readonly id: string;
  readonly file: string;
  readonly followers: readonly string[];
}

/**
 * Blueprints are declared repository-wide and followed per application, so the
 * declaration has to be looked for outside this application's own files. Half
 * the pattern list read `not declared` when it was only ever "declared in
 * another application", which is a different statement entirely.
 */
function readRepositoryDeclarations(root: string): Map<string, string> {
  const declaredIn = new Map<string, string>();
  const pattern = /@Blueprint\s+([\w-]+)/g;
  for (const directory of ['apps', 'infra', 'eslint-rules', 'scripts']) {
    const absolute = listSourceFilesOrEmpty(join(root, directory));
    for (const path of absolute.sort()) {
      const relativePath = relative(root, path);
      for (const match of readSourceOrEmpty(relativePath, root).matchAll(pattern)) {
        const id = match[1];
        if (id !== undefined && !declaredIn.has(id)) declaredIn.set(id, relativePath);
      }
    }
  }
  return declaredIn;
}

function buildBlueprintOverlay(
  files: readonly ArchitectureFile[],
  declaredElsewhere: ReadonlyMap<string, string>,
): BlueprintEntry[] {
  const declaredIn = new Map<string, string>(declaredElsewhere);
  for (const file of files) {
    for (const blueprintId of file.blueprints) declaredIn.set(blueprintId, file.path);
  }
  const followers = new Map<string, string[]>();
  for (const file of files) {
    for (const blueprintId of file.followsBlueprints) {
      followers.set(blueprintId, [...(followers.get(blueprintId) ?? []), file.path]);
    }
  }
  // Only the ids this application actually uses. The repository declares many
  // more, and listing a pattern no file here follows would pad the view with
  // other applications' business.
  const used = new Set([...files.flatMap((file) => file.blueprints), ...followers.keys()]);
  return [...used].sort().map((id) => ({
    id,
    file: declaredIn.get(id) ?? '',
    followers: followers.get(id) ?? [],
  }));
}

export interface ArchitectureModelJson {
  readonly application: string;
  readonly containers: readonly { id: string; name: string; fileCount: number }[];
  readonly externals: readonly { id: string; name: string; reachedFrom: readonly string[] }[];
  readonly files: readonly {
    path: string;
    container: string;
    layer: string;
    context: string;
    feature: string | null;
    exports: readonly string[];
    imports: readonly string[];
    blueprints: readonly string[];
    followsBlueprints: readonly string[];
  }[];
  readonly routes: readonly {
    id: string;
    context: string;
    steps: readonly string[];
    tables: readonly string[];
    externals: readonly string[];
    callerCount: number;
    unreached: boolean;
  }[];
  readonly blueprints: readonly { id: string; file: string; followerCount: number }[];
}

/**
 * The graph as sorted data, committed beside the page.
 *
 * A generated HTML file diffs badly, so the same graph is written as JSON with
 * every list sorted. That makes an architecture change legible in `git diff`
 * and lets `architecture-diff.ts` say what moved between two branches without
 * re-parsing either tree.
 */
function buildModelJson(
  files: readonly ArchitectureFile[],
  manifest: ArchitectureManifest,
  slices: readonly ContextSlice[],
  blueprints: readonly BlueprintEntry[],
): ArchitectureModelJson {
  return {
    application: manifest.application,
    containers: manifest.containers
      .map((container) => ({
        id: container.id,
        name: container.name,
        fileCount: files.filter((file) => containerIdOf(file) === container.id).length,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    externals: manifest.externals
      .map((external) => ({
        id: external.id,
        name: external.name,
        reachedFrom: files
          .filter((file) => file.dependsOnExternal.includes(external.id))
          .map((file) => file.path)
          .sort(),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    files: [...files]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((file) => ({
        path: file.path,
        container: file.container,
        layer: file.layer,
        context: file.context,
        feature: file.feature,
        exports: file.exports.map((each) => each.name).sort(),
        imports: file.imports
          .map((edge) => edge.targetFile)
          .filter((target): target is string => target !== null)
          .sort(),
        blueprints: [...file.blueprints].sort(),
        followsBlueprints: [...file.followsBlueprints].sort(),
      })),
    routes: slices
      .flatMap((slice) =>
        slice.routes.map((route) => ({
          id: `${route.method} ${route.path}`,
          context: slice.context,
          steps: route.steps.map((step) => `${step.layer}:${step.label}`),
          tables: [...route.tables].sort(),
          externals: [...route.externals].sort(),
          callerCount: route.callers.length + route.urlCallers.length,
          unreached: route.callers.length + route.urlCallers.length === 0,
        })),
      )
      .sort((left, right) => left.id.localeCompare(right.id)),
    blueprints: blueprints
      .map((blueprint) => ({
        id: blueprint.id,
        file: blueprint.file,
        followerCount: blueprint.followers.length,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

/** The value following a flag, or null when the flag is absent. */
function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

interface BuildOptions {
  readonly manifest: ArchitectureManifest;
  readonly applicationRoot: string;
  readonly scanRoot: string;
  readonly outputDirectory: string;
  readonly isCheck: boolean;
  /** True when scanning a checkout other than this one, which softens the gates. */
  readonly isForeignTree: boolean;
}

async function buildApplication(options: BuildOptions): Promise<void> {
  const { manifest, applicationRoot, scanRoot, outputDirectory, isCheck, isForeignTree } = options;

  const files = listSourceFiles(applicationRoot)
    .map((absolutePath) => relative(scanRoot, absolutePath))
    .filter((path) => !isTestFile(path))
    .sort()
    .map((path) => buildArchitectureFile(join(scanRoot, path), scanRoot, applicationRoot));

  const problems = validateExternals(files, manifest);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ${problem}`);
    // A scan of another checkout is modelling the target branch, which predates
    // whichever tag or manifest entry this branch adds. Failing there would
    // report every new external as a broken build rather than as the change it
    // is, so the mismatch is only fatal for the tree being committed.
    if (!isForeignTree) {
      console.error(`${problems.length} architecture manifest problem(s).`);
      process.exit(1);
    }
    console.error(
      `${problems.length} manifest difference(s) against the scanned tree, continuing.`,
    );
  }

  const levels = [
    buildContextLevel(files, manifest),
    buildContainerLevel(files, manifest),
    buildComponentLevel(files, manifest),
    buildCodeLevel(files),
  ];
  const urlOnlyScripts = new Map(
    (manifest.urlOnlyScripts ?? []).map((path) => [
      path,
      readApiPathStrings(readSourceOrEmpty(path, scanRoot)),
    ]),
  );
  const slices = buildSlices(files, urlOnlyScripts);
  const blueprints = buildBlueprintOverlay(files, readRepositoryDeclarations(scanRoot));

  const unmarked = files.filter(
    (file) => file.blueprints.length === 0 && file.followsBlueprints.length === 0,
  );

  const layouts = new Map<string, LevelLayout>();
  for (const level of levels) {
    if (level.id === 'code') continue;
    layouts.set(level.id, await layoutLevel(level));
  }

  const journeys = buildJourneys(files);
  const journeyLayouts = new Map<string, LevelLayout>();
  for (const [id, graph] of journeys.graphs) {
    journeyLayouts.set(
      id,
      await layoutLevel({
        id: `journey-${id}`,
        title: id,
        summary: '',
        nodes: graph.nodes,
        edges: graph.edges,
      }),
    );
  }

  const declaredContainers = new Set(manifest.containers.map((each) => each.id));
  const coverage = [
    buildLevelCoverage(
      'context',
      'Every file sits inside the one system box, so this level accounts for all of them by construction. What it cannot show is which file reaches which external — that is level 3.5.',
      files,
      () => true,
    ),
    buildLevelCoverage(
      'container',
      'A file is drawn when its container is one the manifest declares. A file in a container the manifest has never heard of is invisible here.',
      files,
      (file) => declaredContainers.has(containerIdOf(file)),
    ),
    buildLevelCoverage(
      'component',
      'Every file belongs to exactly one context, named by its folder or by a @Feature tag, so this level accounts for all of them.',
      files,
      () => true,
    ),
    buildLevelCoverage(
      'slice',
      'A file is drawn when some user action reaches one of its exports. What is left is either the back end of a feature whose front end does not exist yet, or code no action reaches at all.',
      files,
      (file) => journeys.drawnFiles.has(file.path),
    ),
    buildLevelCoverage('code', 'Every file is a row.', files, () => true),
  ];

  // One source map for the whole page: the journey graphs key their functions,
  // and level 4 and the pattern list key whole files, so a click anywhere opens
  // the same dialog rather than each view carrying its own copy.
  const pageSources: Record<string, SourceEntry> = Object.fromEntries(journeys.sources);
  for (const file of files) {
    pageSources[`file:${file.path}`] = {
      name: file.path.split('/').pop() ?? file.path,
      layer: file.layer,
      location: file.path,
      blueprint: [...file.blueprints, ...file.followsBlueprints][0] ?? '',
      code: readCappedSource(file.path, scanRoot),
      lines: file.lineCount,
      complexity: file.complexity,
      disables: file.lintExceptions,
    };
  }

  const standards = listStandards(scanRoot);
  const histories: Record<string, FileHistory> = {};
  for (const path of [
    ...blueprints.map((blueprint) => blueprint.file),
    ...standards.map((standard) => standard.path),
  ]) {
    if (path === '' || histories[path] !== undefined) continue;
    const history = readFileHistory(path, scanRoot);
    if (history !== null) histories[path] = history;
  }

  const page = renderArchitecturePage({
    manifest,
    sources: pageSources,
    standards,
    histories,
    repositorySlug: REPOSITORY_SLUG,
    layouts,
    journeys,
    journeyLayouts,
    levels,
    slices,
    blueprints,
    files,
    coverage,
    unmarkedCount: unmarked.length,
  });

  mkdirSync(outputDirectory, { recursive: true });
  const pagePath = join(outputDirectory, `${manifest.application}-architecture.html`);
  const modelPath = join(outputDirectory, `${manifest.application}-architecture.json`);
  const model = `${JSON.stringify(buildModelJson(files, manifest, slices, blueprints), null, 2)}\n`;

  if (isCheck) {
    for (const [path, expected] of [
      [modelPath, model],
      [pagePath, page],
    ] as const) {
      if (readSourceOrEmpty(relative(REPOSITORY_ROOT, path)) === expected) continue;
      console.error(
        `  ${relative(REPOSITORY_ROOT, path)} is out of date. Run \`pnpm exec tsx scripts/architecture/architecture-graph.ts\`.`,
      );
      process.exit(1);
    }
    console.log(
      `${manifest.application}: ${files.length} files across ${levels.length} levels and ${slices.length} slices. Up to date.`,
    );
    return;
  }

  writeFileSync(pagePath, page);
  writeFileSync(modelPath, model);
  console.log(
    `${manifest.application}: ${files.length} files, ${levels[3]?.edges.length ?? 0} import edges, ${slices.reduce(
      (total, slice) => total + slice.routes.length,
      0,
    )} routes, ${journeys.features.reduce((total, feature) => total + feature.actions.length, 0)} user actions, ${blueprints.length} blueprints, ${unmarked.length} unmarked files.`,
  );
}

async function main(): Promise<void> {
  // `--list` prints the applications a caller can loop over, so a workflow does
  // not carry a second copy of the register that would drift from this one.
  if (process.argv.includes('--list')) {
    for (const manifest of ARCHITECTURE_MANIFESTS) console.log(manifest.application);
    return;
  }
  const isCheck = process.argv.includes('--check');
  /**
   * `--app-root` points the scan at another checkout of one application, which
   * is how the pull-request workflow models the target branch: it runs this
   * script, at this revision, against a worktree of the merge base. The target
   * branch does not have to carry the generator for its graph to exist.
   */
  const applicationRootFlag = readFlag('--app-root');
  const outputDirectory = readFlag('--out') ?? OUTPUT_DIRECTORY;
  const requested = readFlag('--app');
  if (requested !== null && manifestFor(requested) === undefined) {
    console.error(
      `  --app ${requested} has no manifest. Known: ${ARCHITECTURE_MANIFESTS.map((each) => each.application).join(', ')}.`,
    );
    process.exit(1);
  }
  const selected = ARCHITECTURE_MANIFESTS.filter(
    (manifest) => requested === null || manifest.application === requested,
  );

  if (applicationRootFlag !== null) {
    const manifest = selected[0];
    if (selected.length !== 1 || manifest === undefined) {
      console.error('  --app-root scans one application, so it needs --app <slug>.');
      process.exit(1);
    }
    const applicationRoot = resolve(applicationRootFlag);
    await buildApplication({
      manifest,
      applicationRoot,
      scanRoot: resolve(applicationRoot, '../..'),
      outputDirectory,
      isCheck,
      isForeignTree: true,
    });
    return;
  }

  for (const manifest of selected) {
    await buildApplication({
      manifest,
      applicationRoot: join(REPOSITORY_ROOT, 'apps', manifest.application),
      scanRoot: REPOSITORY_ROOT,
      outputDirectory,
      isCheck,
      isForeignTree: false,
    });
  }

  const indexPath = join(outputDirectory, 'index.html');
  const index = renderArchitectureIndex(ARCHITECTURE_MANIFESTS);
  if (isCheck) {
    if (readSourceOrEmpty(relative(REPOSITORY_ROOT, indexPath)) !== index) {
      console.error(
        `  ${relative(REPOSITORY_ROOT, indexPath)} is out of date. Run \`pnpm exec tsx scripts/architecture/architecture-graph.ts\`.`,
      );
      process.exit(1);
    }
    return;
  }
  writeFileSync(indexPath, index);
  console.log(
    `Wrote ${relative(REPOSITORY_ROOT, outputDirectory)}/ for ${selected.length} app(s).`,
  );
}

await main();
