import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { buildJourneys, type SourceEntry } from './architecture-journeys';
import { filePathOfLocation } from './journey-status.core';
import { type LevelLayout, layoutLevel } from './architecture-layout';
import {
  type DiffReport,
  renderArchitectureIndex,
  renderArchitecturePage,
} from './architecture-page';
import {
  type ArchitectureFile,
  type NodeMetrics,
  aggregateMetrics,
  buildArchitectureFile,
  buildArchitectureFileFromText,
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
  type ArchitectureModel,
  architectureModelSchema,
  diffSummarySchema,
  type DiffSummary,
} from './architecture-model-json';
import {
  ARCHITECTURE_MANIFESTS,
  type ArchitectureManifest,
  manifestFor,
} from './architecture-manifest';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIRECTORY = join(REPOSITORY_ROOT, 'docs/architecture');
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'cdk.out', '__fixtures__']);

function isToolingDirectory(name: string): boolean {
  return name.startsWith('.') || SKIPPED_DIRECTORIES.has(name);
}
const SOURCE_PATTERN = /\.tsx?$/;
const REPOSITORY_SLUG = 'hugoleborso/borso.fr';
const SHORT_SHA_LENGTH = 12;
const GROUPING_LEVELS = ['container', 'component'] as const;
const MAXIMUM_MODAL_LINES = 400;
const MAXIMUM_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
function readHeadRevision(root: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

function listTrackedStandardFileNames(directory: string, root: string): string[] {
  try {
    const tracked = new Set(
      execFileSync('git', ['ls-files', 'docs/standards'], { cwd: root, encoding: 'utf8' })
        .split('\n')
        .map((path) => path.slice('docs/standards/'.length)),
    );
    return readdirSync(directory)
      .filter((name) => name.endsWith('.md') && name !== 'README.md' && tracked.has(name))
      .sort();
  } catch {
    return [];
  }
}

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

export interface StandardVersion {
  readonly sha: string;
  readonly date: string;
  readonly subject: string;
  readonly text: string;
}

export interface StandardEntry {
  readonly path: string;
  readonly title: string;
  readonly rule: string;
  readonly versions: readonly StandardVersion[];
}

function readGitOutput(root: string, argumentList: readonly string[]): string {
  try {
    return execFileSync('git', [...argumentList], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: MAXIMUM_GIT_OUTPUT_BYTES,
    });
  } catch {
    return '';
  }
}

function readVersions(repositoryRelativePath: string, root: string): StandardVersion[] {
  const log = readGitOutput(root, [
    'log',
    '--format=%h|%ad|%s',
    '--date=short',
    '--',
    repositoryRelativePath,
  ]);
  return log
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [sha = '', date = '', ...subject] = line.split('|');
      return {
        sha,
        date,
        subject: subject.join('|'),
        text: readGitOutput(root, ['show', `${sha}:${repositoryRelativePath}`]),
      };
    });
}

function listStandards(root: string): StandardEntry[] {
  const directory = 'docs/standards';
  const names = listTrackedStandardFileNames(join(root, directory), root);
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
    return { path, title, rule, versions: readVersions(path, root) };
  });
}

function readCappedSource(repositoryRelativePath: string, root: string): string {
  return capSource(readSourceOrEmpty(repositoryRelativePath, root));
}

function capSource(text: string): string {
  const lines = text.split('\n');
  if (lines.length <= MAXIMUM_MODAL_LINES) return text;
  return `${lines.slice(0, MAXIMUM_MODAL_LINES).join('\n')}\n\n// … ${lines.length - MAXIMUM_MODAL_LINES} more lines, see the file`;
}

function readSourceAt(revision: string, repositoryRelativePath: string): string {
  return capSource(
    readGitOutput(REPOSITORY_ROOT, ['show', `${revision}:${repositoryRelativePath}`]),
  );
}

function readSourceOrEmpty(repositoryRelativePath: string, root: string = REPOSITORY_ROOT): string {
  try {
    return readFileSync(join(root, repositoryRelativePath), 'utf8');
  } catch {
    return '';
  }
}

const HTML_MODULE_SCRIPT = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/g;

function readHtmlEntries(applicationRoot: string, scanRoot: string): string[] {
  const found: string[] = [];
  for (const page of listFilesNamed(applicationRoot, 'index.html')) {
    for (const match of readSourceOrEmpty(relative(scanRoot, page), scanRoot).matchAll(
      HTML_MODULE_SCRIPT,
    )) {
      const specifier = match[1];
      if (specifier === undefined || !SOURCE_PATTERN.test(specifier)) continue;
      found.push(relative(scanRoot, resolve(dirname(page), specifier)));
    }
  }
  return [...new Set(found)].sort();
}

function listFilesNamed(directory: string, name: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (isToolingDirectory(entry.name)) continue;
      found.push(...listFilesNamed(join(directory, entry.name), name));
      continue;
    }
    if (entry.name === name) found.push(join(directory, entry.name));
  }
  return found;
}

function listSourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (isToolingDirectory(entry.name)) continue;
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
  readonly layer?: string;
  readonly location?: string;
  readonly sourceKey?: string;
  readonly metrics?: NodeMetrics;
  readonly icon?: string;
  readonly lines?: readonly string[];
  readonly chips?: readonly NodeChip[];
}

export interface NodeChip {
  readonly icon: string;
  readonly text: string;
  readonly tone: 'plain' | 'blueprint' | 'complexity' | 'size' | 'warn';
}

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

export type NodeStatus = 'added' | 'changed' | 'moved' | 'removed';

export type StatusByNode = ReadonlyMap<string, NodeStatus>;

export interface LayerCoverage {
  readonly layer: string;
  readonly covered: number;
  readonly total: number;
}

export interface LevelCoverage {
  readonly levelId: string;
  readonly rule: string;
  readonly byLayer: readonly LayerCoverage[];
  readonly uncovered: readonly string[];
}

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
        ...(owned.length === 0 && container.noScannedSourceNote !== undefined
          ? wrapNote(container.noScannedSourceNote)
          : []),
      ],
      chips:
        owned.length === 0
          ? [
              {
                icon: FILE_ICON,
                text:
                  container.noScannedSourceNote === undefined
                    ? 'no file the scan reads'
                    : 'source outside the scan',
                tone: 'plain' as const,
              },
            ]
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

const NOTE_ROW_CHARACTERS = 58;

function wrapNote(note: string): string[] {
  const rows: string[] = [];
  let current = '';
  for (const word of note.split(' ')) {
    if (current !== '' && `${current} ${word}`.length > NOTE_ROW_CHARACTERS) {
      rows.push(current);
      current = word;
      continue;
    }
    current = current === '' ? word : `${current} ${word}`;
  }
  if (current !== '') rows.push(current);
  return rows;
}

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
    const markedCount = owned.filter(
      (file) => file.blueprints.length > 0 || file.followsBlueprints.length > 0,
    ).length;
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
        {
          icon: BLUEPRINT_ICON,
          text: `${blueprintIds.length} pattern${blueprintIds.length === 1 ? '' : 's'} · ${markedCount}/${owned.length} marked`,
          tone: 'blueprint',
        },
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
  readonly urlCallers: readonly string[];
}

export interface ContextSlice {
  readonly id: string;
  readonly context: string;
  readonly mountPath: string | null;
  readonly routes: readonly SliceRoute[];
  readonly files: readonly { path: string; layer: string; lineCount: number }[];
}

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
    digest: string;
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
        digest: file.digest,
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

function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function nodeIdentitiesOf(model: ArchitectureModel): {
  context: Map<string, string>;
  container: Map<string, string>;
  blueprint: Map<string, string>;
  component: Map<string, string>;
  code: Map<string, string>;
  pathsByComponent: Map<string, readonly string[]>;
  containerByPath: Map<string, string>;
  componentByPath: Map<string, string>;
  digestByPath: Map<string, string>;
} {
  const context = new Map<string, string>();
  for (const external of model.externals) context.set(external.id, external.reachedFrom.join());
  const blueprint = new Map<string, string>();
  for (const each of model.blueprints) blueprint.set(each.id, `${each.file}|${each.followerCount}`);
  const container = new Map<string, string[]>();
  const containerByPath = new Map<string, string>();
  const component = new Map<string, string[]>();
  const componentByPath = new Map<string, string>();
  const digestByPath = new Map<string, string>();
  const code = new Map<string, string>();
  for (const file of model.files) {
    const containerId = CONTAINER_BY_SOURCE[file.container] ?? file.container;
    const id = `${containerId}::${file.feature ?? file.context}`;
    const stamp = `${file.path}:${file.digest}`;
    container.set(containerId, [...(container.get(containerId) ?? []), stamp]);
    component.set(id, [...(component.get(id) ?? []), stamp]);
    containerByPath.set(file.path, containerId);
    componentByPath.set(file.path, id);
    digestByPath.set(file.path, file.digest);
    code.set(file.path, `${file.container}/${file.layer}/${file.digest}`);
  }
  const joined = (entries: Map<string, string[]>): Map<string, string> =>
    new Map([...entries].map(([id, stamps]) => [id, stamps.sort().join()]));
  return {
    context,
    container: joined(container),
    blueprint,
    component: joined(component),
    code,
    containerByPath,
    pathsByComponent: new Map(
      [...component].map(([id, stamps]) => [id, stamps.map((stamp) => stamp.split(':')[0] ?? '')]),
    ),
    componentByPath,
    digestByPath,
  };
}

type ModelIdentities = ReturnType<typeof nodeIdentitiesOf>;

function renamesBetween(
  base: ModelIdentities,
  head: ModelIdentities,
  diffRef: string | null,
): Map<string, string> {
  const renames = new Map<string, string>();
  const gone = [...base.code.keys()].filter((path) => !head.code.has(path));
  const fresh = [...head.code.keys()].filter((path) => !base.code.has(path));
  if (diffRef !== null) {
    const reported = readGitOutput(REPOSITORY_ROOT, [
      'diff',
      '--name-status',
      '-M',
      '--diff-filter=R',
      diffRef,
    ]);
    for (const line of reported.split('\n')) {
      const [, from, to] = line.split('\t');
      if (from === undefined || to === undefined) continue;
      if (gone.includes(from) && fresh.includes(to)) renames.set(to, from);
    }
  }
  const takenSources = new Set(renames.values());
  for (const to of fresh) {
    if (renames.has(to)) continue;
    const digest = head.digestByPath.get(to);
    const from = gone.find(
      (path) => !takenSources.has(path) && base.digestByPath.get(path) === digest,
    );
    if (from === undefined) continue;
    renames.set(to, from);
    takenSources.add(from);
  }
  return renames;
}

function statusesBetween(
  base: ReadonlyMap<string, string>,
  head: ReadonlyMap<string, string>,
): Map<string, NodeStatus> {
  const statuses = new Map<string, NodeStatus>();
  for (const [id, signature] of head) {
    const before = base.get(id);
    if (before === undefined) statuses.set(id, 'added');
    else if (before !== signature) statuses.set(id, 'changed');
  }
  for (const id of base.keys()) {
    if (!head.has(id)) statuses.set(id, 'removed');
  }
  return statuses;
}

function codeStatuses(
  base: ModelIdentities,
  head: ModelIdentities,
  renames: ReadonlyMap<string, string>,
): Map<string, NodeStatus> {
  const statuses = statusesBetween(base.code, head.code);
  for (const [to, from] of renames) {
    statuses.delete(from);
    statuses.set(
      to,
      base.digestByPath.get(from) === head.digestByPath.get(to) ? 'moved' : 'changed',
    );
  }
  return statuses;
}

function contextStatuses(base: ModelIdentities, head: ModelIdentities): Map<string, NodeStatus> {
  const statuses = statusesBetween(base.context, head.context);
  for (const [id, status] of statuses) {
    if (status === 'changed' && base.context.get(id) === '') statuses.delete(id);
  }
  return statuses;
}

function componentStatuses(
  base: ModelIdentities,
  head: ModelIdentities,
  renames: ReadonlyMap<string, string>,
): { statuses: Map<string, NodeStatus>; regroupedInto: Map<string, readonly string[]> } {
  const statuses = statusesBetween(base.component, head.component);
  const headPathOf = new Map([...renames].map(([to, from]) => [from, to]));
  const regroupedInto = new Map<string, readonly string[]>();
  for (const [id, status] of statuses) {
    if (status !== 'removed') continue;
    const wasHolding = base.pathsByComponent.get(id) ?? [];
    const landedIn = wasHolding.map((path) =>
      head.componentByPath.get(headPathOf.get(path) ?? path),
    );
    if (landedIn.some((group) => group === undefined)) continue;
    statuses.set(id, 'moved');
    regroupedInto.set(id, [...new Set(landedIn.filter((group) => group !== undefined))].sort());
  }
  return { statuses, regroupedInto };
}

function ghostNode(id: string, label: string, kind: string, detail: string): GraphNode {
  return {
    id,
    label,
    kind,
    detail,
    group: null,
    blueprints: [],
    followsBlueprints: [],
    fileCount: 0,
    icon: '🪦',
    lines: ['gone on this branch'],
  };
}

function fileMovement(
  base: ModelIdentities,
  head: ModelIdentities,
  code: ReadonlyMap<string, NodeStatus>,
  renames: ReadonlyMap<string, string>,
): Map<string, Map<string, string>> {
  const entered = new Map<string, Map<string, number>>();
  const left = new Map<string, Map<string, number>>();
  const bump = (side: Map<string, Map<string, number>>, level: string, id: string): void => {
    const group = side.get(level) ?? new Map<string, number>();
    group.set(id, (group.get(id) ?? 0) + 1);
    side.set(level, group);
  };
  const groupOf = (identities: ModelIdentities, level: string, path: string): string | undefined =>
    level === 'container'
      ? identities.containerByPath.get(path)
      : identities.componentByPath.get(path);

  for (const [path, status] of code) {
    const wasPath = renames.get(path) ?? path;
    for (const level of GROUPING_LEVELS) {
      const was = status === 'added' ? undefined : groupOf(base, level, wasPath);
      const now = status === 'removed' ? undefined : groupOf(head, level, path);
      if (was === now) continue;
      if (was !== undefined) bump(left, level, was);
      if (now !== undefined) bump(entered, level, now);
    }
  }

  const byLevel = new Map<string, Map<string, string>>();
  for (const level of GROUPING_LEVELS) {
    const lines = new Map<string, string>();
    const inCount = entered.get(level) ?? new Map<string, number>();
    const outCount = left.get(level) ?? new Map<string, number>();
    for (const id of new Set([...inCount.keys(), ...outCount.keys()])) {
      const parts = [
        (inCount.get(id) ?? 0) === 0 ? '' : `+${inCount.get(id) ?? 0}`,
        (outCount.get(id) ?? 0) === 0 ? '' : `\u2212${outCount.get(id) ?? 0}`,
      ].filter((part) => part !== '');
      lines.set(id, `${parts.join(' ')} files`);
    }
    byLevel.set(level, lines);
  }
  return byLevel;
}

function regroupedNode(
  id: string,
  label: string,
  kind: string,
  landedIn: readonly string[],
): GraphNode {
  const names = landedIn.map((each) => each.split('::')[1] ?? each);
  return {
    id,
    label,
    kind,
    detail: `Regrouped into ${names.join(', ')}`,
    group: null,
    blueprints: [],
    followsBlueprints: [],
    fileCount: 0,
    icon: '📦',
    lines: ['no code removed', `now in ${names.join(', ')}`],
  };
}

interface DiffPageOptions {
  readonly diffBase: string;
  readonly diffRef: string | null;
  readonly manifest: ArchitectureManifest;
  readonly headModel: string;
  readonly levels: readonly GraphLevel[];
  readonly pageSources: Readonly<Record<string, SourceEntry>>;
  readonly applicationRoot: string;
  readonly standards: readonly StandardEntry[];
  readonly histories: Readonly<Record<string, FileHistory>>;
  readonly journeys: ReturnType<typeof buildJourneys>;
  readonly journeyLayouts: ReadonlyMap<string, LevelLayout>;
  readonly slices: readonly ContextSlice[];
  readonly blueprints: readonly BlueprintEntry[];
  readonly files: readonly ArchitectureFile[];
  readonly coverage: readonly LevelCoverage[];
  readonly unmarkedCount: number;
  readonly outputDirectory: string;
}

async function writeDiffPage(options: DiffPageOptions): Promise<void> {
  const basePath = join(options.diffBase, `${options.manifest.application}-architecture.json`);
  const baseText = readSourceOrEmpty(basePath, '/');
  if (baseText === '') {
    console.error(`  ${basePath} is not there, so no diff page for this application.`);
    return;
  }
  const baseParsed: unknown = JSON.parse(baseText);
  const headParsed: unknown = JSON.parse(options.headModel);
  const baseModel = architectureModelSchema.parse(baseParsed);
  const headModel = architectureModelSchema.parse(headParsed);
  const base = nodeIdentitiesOf(baseModel);
  const head = nodeIdentitiesOf(headModel);

  const renames = renamesBetween(base, head, options.diffRef);
  const code = codeStatuses(base, head, renames);
  const component = componentStatuses(base, head, renames);
  const statuses = new Map<string, StatusByNode>([
    ['context', contextStatuses(base, head)],
    ['container', statusesBetween(base.container, head.container)],
    ['component', component.statuses],
    ['code', code],
    ['blueprint', statusesBetween(base.blueprint, head.blueprint)],
  ]);

  const externalName = new Map(baseModel.externals.map((each) => [each.id, each.name]));
  const containerName = new Map(baseModel.containers.map((each) => [each.id, each.name]));
  const diffLevels = options.levels.map((level) => {
    const missing = [...(statuses.get(level.id) ?? new Map())].filter(
      ([id, status]) =>
        (status === 'removed' || (status === 'moved' && component.regroupedInto.has(id))) &&
        !level.nodes.some((node) => node.id === id),
    );
    if (level.id === 'code' || missing.length === 0) return level;
    const ghosts = missing.map(([id, status]) => {
      const landedIn = component.regroupedInto.get(id);
      if (status === 'moved' && landedIn !== undefined) {
        return regroupedNode(
          id,
          id.split('::')[1] ?? id,
          `component-${id.split('::')[0] ?? 'unknown'}`,
          landedIn,
        );
      }
      return level.id === 'context'
        ? ghostNode(
            id,
            externalName.get(id) ?? id,
            'external-third-party',
            'Removed on this branch',
          )
        : level.id === 'container'
          ? ghostNode(id, containerName.get(id) ?? id, 'container-build', 'Removed on this branch')
          : ghostNode(
              id,
              id.split('::')[1] ?? id,
              `component-${id.split('::')[0] ?? 'unknown'}`,
              'Removed on this branch',
            );
    });
    return { ...level, nodes: [...level.nodes, ...ghosts] };
  });

  const movement = fileMovement(base, head, code, renames);
  const annotatedLevels = diffLevels.map((level) => {
    if (level.id !== 'container' && level.id !== 'component') return level;
    return {
      ...level,
      nodes: level.nodes.map((node) => {
        const moved = movement.get(level.id)?.get(node.id);
        if (moved === undefined) return node;
        return { ...node, lines: [...(node.lines ?? []), moved] };
      }),
    };
  });

  const diffLayouts = new Map<string, LevelLayout>();
  for (const level of annotatedLevels) {
    if (level.id === 'code') continue;
    diffLayouts.set(level.id, await layoutLevel(level));
  }

  const report = buildDiffReport({
    base,
    baseModel,
    headModel,
    code,
    renames,
    diffRef: options.diffRef,
  });

  writeFileSync(
    join(options.outputDirectory, `${options.manifest.application}-diff.json`),
    `${JSON.stringify({ counts: report.counts }, null, 2)}\n`,
  );

  writeFileSync(
    join(options.outputDirectory, `${options.manifest.application}-diff.html`),
    renderArchitecturePage({
      manifest: options.manifest,
      sources: withBaseSources(
        options.pageSources,
        code,
        renames,
        options.diffRef,
        options.applicationRoot,
      ),
      standards: options.standards,
      histories: options.histories,
      historyRevision: readHeadRevision(REPOSITORY_ROOT),
      repositorySlug: REPOSITORY_SLUG,
      layouts: diffLayouts,
      journeys: options.journeys,
      journeyLayouts: options.journeyLayouts,
      levels: annotatedLevels,
      slices: options.slices,
      blueprints: options.blueprints,
      files: options.files,
      coverage: options.coverage,
      unmarkedCount: options.unmarkedCount,
      statuses,
      report,
    }),
  );
}

function readBaseSymbolSources(
  diffRef: string,
  path: string,
  basePath: string,
  applicationRoot: string,
): ReadonlyMap<string, string> {
  const text = readSourceAt(diffRef, basePath);
  if (text === '') return new Map();
  const parsed = buildArchitectureFileFromText(
    join(REPOSITORY_ROOT, path),
    text,
    REPOSITORY_ROOT,
    applicationRoot,
  );
  return new Map(parsed.exports.map((exported) => [exported.name, exported.source]));
}

function withBaseSources(
  sources: Readonly<Record<string, SourceEntry>>,
  code: ReadonlyMap<string, NodeStatus>,
  renames: ReadonlyMap<string, string>,
  diffRef: string | null,
  applicationRoot: string,
): Readonly<Record<string, SourceEntry>> {
  if (diffRef === null) return sources;
  const withBase: Record<string, SourceEntry> = { ...sources };
  const baseSymbolsByPath = new Map<string, ReadonlyMap<string, string>>();
  for (const [key, entry] of Object.entries(sources)) {
    const path = filePathOfLocation(entry.location);
    const status = code.get(path);
    if (status === 'added') {
      withBase[key] = { ...entry, baseCode: '', isNew: true };
      continue;
    }
    if (status !== 'changed') continue;
    const baseFileText = readSourceAt(diffRef, renames.get(path) ?? path);
    if (baseFileText === '') continue;
    if (entry.location === path) {
      withBase[key] = { ...entry, baseCode: baseFileText };
      continue;
    }
    const symbols =
      baseSymbolsByPath.get(path) ??
      readBaseSymbolSources(diffRef, path, renames.get(path) ?? path, applicationRoot);
    baseSymbolsByPath.set(path, symbols);
    const baseCode = symbols.get(entry.name);
    withBase[key] =
      baseCode === undefined ? { ...entry, baseCode: '', isNew: true } : { ...entry, baseCode };
  }
  return withBase;
}

interface DiffReportInput {
  readonly base: ModelIdentities;
  readonly baseModel: ArchitectureModel;
  readonly headModel: ArchitectureModel;
  readonly code: ReadonlyMap<string, NodeStatus>;
  readonly renames: ReadonlyMap<string, string>;
  readonly diffRef: string | null;
}

function buildDiffReport(input: DiffReportInput): DiffReport {
  const { base, baseModel, headModel, code, renames, diffRef } = input;
  const countOf = (wanted: NodeStatus): number =>
    [...code].filter(([path, status]) => status === wanted && !renames.has(path)).length;
  const declaredOnly = [...base.context].filter(
    ([id, before]) =>
      before === '' &&
      (headModel.externals.find((each) => each.id === id)?.reachedFrom.length ?? 0) > 0,
  ).length;
  const removedPaths = [...code]
    .filter(([, status]) => status === 'removed')
    .map(([path]) => path)
    .sort();
  const byPath = new Map(baseModel.files.map((file) => [file.path, file]));
  return {
    baseline: diffRef === null ? 'the target branch' : diffRef.slice(0, SHORT_SHA_LENGTH),
    counts: [
      { label: 'added', value: countOf('added') },
      { label: 'renamed', value: renames.size },
      { label: 'edited', value: countOf('changed') },
      { label: 'removed', value: removedPaths.length },
    ],
    notes:
      declaredOnly === 0
        ? []
        : [
            `${declaredOnly} external${declaredOnly === 1 ? '' : 's'} carried no @DependsOnExternal declaration on the base. Declaring one is documentation, not a new dependency, so those blocks are left uncoloured.`,
          ],
    renamedFrom: Object.fromEntries(renames),
    removedFiles: removedPaths.map((path) => ({
      path,
      layer: byPath.get(path)?.layer ?? 'unknown',
      context: byPath.get(path)?.feature ?? byPath.get(path)?.context ?? 'unknown',
    })),
    deltas: {
      'source files': headModel.files.length - baseModel.files.length,
      'HTTP routes': headModel.routes.length - baseModel.routes.length,
      blueprints: headModel.blueprints.length - baseModel.blueprints.length,
      containers: headModel.containers.length - baseModel.containers.length,
    },
  };
}

interface BuildOptions {
  readonly manifest: ArchitectureManifest;
  readonly applicationRoot: string;
  readonly scanRoot: string;
  readonly outputDirectory: string;
  readonly isCheck: boolean;
  readonly isForeignTree: boolean;
  readonly diffBase: string | null;
  readonly diffRef: string | null;
}

async function buildApplication(options: BuildOptions): Promise<void> {
  const {
    manifest,
    applicationRoot,
    scanRoot,
    outputDirectory,
    isCheck,
    isForeignTree,
    diffBase,
    diffRef,
  } = options;

  const files = listSourceFiles(applicationRoot)
    .map((absolutePath) => relative(scanRoot, absolutePath))
    .filter((path) => !isTestFile(path))
    .sort()
    .map((path) => buildArchitectureFile(join(scanRoot, path), scanRoot, applicationRoot));

  const problems = validateExternals(files, manifest);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ${problem}`);
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

  const journeys = buildJourneys(files, readHtmlEntries(applicationRoot, scanRoot));
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
      "Three walks meet here. A flow is one action end to end — the screen, the components between it and the gesture, the hook, the controller the endpoint is declared in, and everything the handler calls down to the table. A feature's own view adds what those pages are made of, every component they render and every pure helper they lean on, because an atom sits in no data flow and a level built only from flows would report most of a front end as unreached. The last two are the journeys that are not data flows at all: opening the application, which runs the entry module and renders the frame every address sits inside, and sending any request, which lands on the API's composition root before a route is chosen. What is left in the list is the honest gap: process entry points, build configuration, ambient type declarations, and code no journey reaches.",
      files,
      (file) => journeys.drawnFiles.has(file.path),
    ),
    buildLevelCoverage('code', 'Every file is a row.', files, () => true),
  ];

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

  const model = `${JSON.stringify(buildModelJson(files, manifest, slices, blueprints), null, 2)}\n`;

  const page = renderArchitecturePage({
    manifest,
    sources: pageSources,
    standards,
    histories,
    historyRevision: readHeadRevision(scanRoot),
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

  if (diffBase !== null) {
    await writeDiffPage({
      diffBase,
      diffRef,
      manifest,
      headModel: model,
      levels,
      pageSources,
      applicationRoot,
      standards,
      histories,
      journeys,
      journeyLayouts,
      slices,
      blueprints,
      files,
      coverage,
      unmarkedCount: unmarked.length,
      outputDirectory,
    });
  }

  if (isCheck) {
    writeFileSync(pagePath, page);
    writeFileSync(modelPath, model);
    console.log(
      `${manifest.application}: ${files.length} files across ${levels.length} levels and ${slices.length} slices.`,
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

function readDiffSummaries(outputDirectory: string): ReadonlyMap<string, DiffSummary> {
  const summaries = new Map<string, DiffSummary>();
  for (const manifest of ARCHITECTURE_MANIFESTS) {
    const summaryPath = join(outputDirectory, `${manifest.application}-diff.json`);
    if (!existsSync(summaryPath)) continue;
    const parsed: unknown = JSON.parse(readFileSync(summaryPath, 'utf8'));
    const summary = diffSummarySchema.safeParse(parsed);
    if (summary.success) summaries.set(manifest.application, summary.data);
  }
  return summaries;
}

async function main(): Promise<void> {
  if (process.argv.includes('--list')) {
    for (const manifest of ARCHITECTURE_MANIFESTS) console.log(manifest.application);
    return;
  }
  const isCheck = process.argv.includes('--check');
  const applicationRootFlag = readFlag('--app-root');
  const outputDirectory = readFlag('--out') ?? OUTPUT_DIRECTORY;
  const requested = readFlag('--app');
  const diffBase = readFlag('--diff-base');
  const diffRef = readFlag('--diff-ref');
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
      diffBase: null,
      diffRef: null,
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
      diffBase,
      diffRef,
    });
  }

  if (isCheck) return;

  const indexPath = join(outputDirectory, 'index.html');
  writeFileSync(
    indexPath,
    renderArchitectureIndex(ARCHITECTURE_MANIFESTS, readDiffSummaries(outputDirectory)),
  );
  console.log(
    `Wrote ${relative(REPOSITORY_ROOT, outputDirectory)}/ for ${selected.length} app(s).`,
  );
}

await main();
