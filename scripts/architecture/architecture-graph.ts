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

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { buildJourneys } from './architecture-journeys';
import { type LevelLayout, layoutLevel } from './architecture-layout';
import { renderArchitecturePage } from './architecture-page';
import {
  type ArchitectureFile,
  type NodeMetrics,
  aggregateMetrics,
  buildArchitectureFile,
  isTestFile,
  metricLines,
  readApiPathStrings,
} from './architecture-model';
import { type ArchitectureManifest, pragmaManifest } from './pragma.manifest';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIRECTORY = join(REPOSITORY_ROOT, 'docs/architecture');
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'cdk.out', '.git', '__fixtures__']);
const SOURCE_PATTERN = /\.tsx?$/;

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
  /** Lines the block prints, longest first, so the layout can size the box. */
  readonly lines?: readonly string[];
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

function buildContextLevel(
  files: readonly ArchitectureFile[],
  manifest: ArchitectureManifest,
): GraphLevel {
  const referenced = new Set(files.flatMap((file) => file.dependsOnExternal));
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
      lines: ['actor'],
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
      metrics: aggregateMetrics(files),
      lines: metricLines(aggregateMetrics(files), `${files.length} files`),
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
        lines: [external.technology],
      })),
  ];

  const edges: GraphEdge[] = [
    ...manifest.actors.map((actor) => ({
      from: actor.id,
      to: 'system',
      label: 'Manages the catalogue, sessions and setlists',
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
      lines:
        owned.length === 0
          ? [container.technology.split(',')[0] ?? '']
          : metricLines(metrics, `${metrics.files} files`),
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
  if (files.some((file) => file.apiCalls.length > 0)) {
    edges.push({
      from: 'site',
      to: 'api',
      label: 'JSON over HTTPS, session cookie, typed by the router',
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
  const nodes: GraphNode[] = [...grouped.entries()].map(([id, owned]) => {
    const [containerId, contextName] = id.split('::');
    const layers = [...new Set(owned.map((file) => file.layer))].sort();
    const routeCount = owned.reduce((total, file) => total + file.routes.length, 0);
    const metrics = aggregateMetrics(owned);
    return {
      id,
      label: contextName ?? id,
      kind: `component-${containerId ?? 'unknown'}`,
      detail: `${owned.length} files in ${containerName.get(containerId ?? '') ?? containerId}. Layers: ${layers.join(', ')}.${
        routeCount > 0 ? ` ${routeCount} HTTP routes.` : ''
      }`,
      group: containerId ?? null,
      blueprints: owned.flatMap((file) => file.blueprints),
      followsBlueprints: owned.flatMap((file) => file.followsBlueprints),
      fileCount: owned.length,
      metrics,
      lines: metricLines(
        metrics,
        `${metrics.files} files${routeCount > 0 ? ` · ${routeCount} routes` : ''}`,
      ),
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
      'Bounded contexts on the back and feature areas on the front, with the import edges between them. A back-end context is a folder under api/src; a front-end one is a @Feature tag, falling back to the folder.',
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

function buildBlueprintOverlay(files: readonly ArchitectureFile[]): BlueprintEntry[] {
  const declaredIn = new Map<string, string>();
  for (const file of files) {
    for (const blueprintId of file.blueprints) declaredIn.set(blueprintId, file.path);
  }
  const followers = new Map<string, string[]>();
  for (const file of files) {
    for (const blueprintId of file.followsBlueprints) {
      followers.set(blueprintId, [...(followers.get(blueprintId) ?? []), file.path]);
    }
  }
  return [...new Set([...declaredIn.keys(), ...followers.keys()])].sort().map((id) => ({
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

async function main(): Promise<void> {
  const isCheck = process.argv.includes('--check');
  /**
   * `--app-root` points the scan at another checkout of the same application,
   * which is how the pull-request workflow models the target branch: it runs
   * this script, at this revision, against a worktree of the merge base. The
   * target branch does not have to carry the generator for its graph to exist.
   */
  const applicationRootFlag = readFlag('--app-root');
  const applicationRoot =
    applicationRootFlag === null
      ? join(REPOSITORY_ROOT, 'apps', pragmaManifest.application)
      : resolve(applicationRootFlag);
  const scanRoot =
    applicationRootFlag === null ? REPOSITORY_ROOT : resolve(applicationRoot, '../..');
  const outputDirectory = readFlag('--out') ?? OUTPUT_DIRECTORY;

  const files = listSourceFiles(applicationRoot)
    .map((absolutePath) => relative(scanRoot, absolutePath))
    .filter((path) => !isTestFile(path))
    .sort()
    .map((path) => buildArchitectureFile(join(scanRoot, path), scanRoot, applicationRoot));

  const problems = validateExternals(files, pragmaManifest);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ${problem}`);
    // A scan of another checkout is modelling the target branch, which predates
    // whichever tag or manifest entry this branch adds. Failing there would
    // report every new external as a broken build rather than as the change it
    // is, so the mismatch is only fatal for the tree being committed.
    if (applicationRootFlag === null) {
      console.error(`${problems.length} architecture manifest problem(s).`);
      process.exit(1);
    }
    console.error(
      `${problems.length} manifest difference(s) against the scanned tree, continuing.`,
    );
  }

  const levels = [
    buildContextLevel(files, pragmaManifest),
    buildContainerLevel(files, pragmaManifest),
    buildComponentLevel(files, pragmaManifest),
    buildCodeLevel(files),
  ];
  const serviceWorkerPath = 'apps/pragma/site/public/sw.js';
  const serviceWorkerUrls = readApiPathStrings(readSourceOrEmpty(serviceWorkerPath, scanRoot));
  const slices = buildSlices(files, new Map([[serviceWorkerPath, serviceWorkerUrls]]));
  const blueprints = buildBlueprintOverlay(files);

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

  const page = renderArchitecturePage({
    manifest: pragmaManifest,
    layouts,
    journeys,
    journeyLayouts,
    levels,
    slices,
    blueprints,
    files,
    unmarkedCount: unmarked.length,
  });

  mkdirSync(outputDirectory, { recursive: true });
  const pagePath = join(outputDirectory, 'pragma-architecture.html');
  const modelPath = join(outputDirectory, 'pragma-architecture.json');
  const model = `${JSON.stringify(buildModelJson(files, pragmaManifest, slices, blueprints), null, 2)}\n`;

  if (isCheck) {
    if (readSourceOrEmpty(relative(REPOSITORY_ROOT, modelPath)) !== model) {
      console.error(
        `  ${relative(REPOSITORY_ROOT, modelPath)} is out of date. Run \`pnpm exec tsx scripts/architecture/architecture-graph.ts\`.`,
      );
      process.exit(1);
    }
    if (readSourceOrEmpty(relative(REPOSITORY_ROOT, pagePath)) !== page) {
      console.error(
        `  ${relative(REPOSITORY_ROOT, pagePath)} is out of date. Run \`pnpm exec tsx scripts/architecture/architecture-graph.ts\`.`,
      );
      process.exit(1);
    }
    console.log(
      `Scanned ${files.length} files across ${levels.length} levels and ${slices.length} slices. The page is up to date.`,
    );
    return;
  }

  writeFileSync(pagePath, page);
  writeFileSync(modelPath, model);
  console.log(
    `Scanned ${files.length} files: ${levels[3]?.edges.length ?? 0} import edges, ${slices.reduce(
      (total, slice) => total + slice.routes.length,
      0,
    )} routes, ${journeys.features.reduce((total, feature) => total + feature.actions.length, 0)} user actions, ${blueprints.length} blueprints, ${unmarked.length} unmarked files.`,
  );
  console.log(
    `Wrote ${relative(REPOSITORY_ROOT, pagePath)} and ${relative(REPOSITORY_ROOT, modelPath)}`,
  );
}

await main();
