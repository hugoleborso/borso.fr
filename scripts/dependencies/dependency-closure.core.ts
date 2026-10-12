import { createHash } from 'node:crypto';
import { posix } from 'node:path';

type SectionName = string | undefined;

const LINK_PREFIX = 'link:';
const ROOT_IMPORTER = '.';
const IMPORTER_MARKER = 'importer:';
const GRAPH_SECTIONS: ReadonlySet<SectionName> = new Set([
  'catalogs',
  'importers',
  'packages',
  'snapshots',
]);
const DEPENDENCY_FIELDS: ReadonlySet<SectionName> = new Set([
  'dependencies',
  'devDependencies',
  'optionalDependencies',
]);
const CATALOG_SECTIONS: ReadonlySet<SectionName> = new Set(['catalog', 'catalogs']);
const ROOT_MANIFEST_FIELDS = ['packageManager', 'pnpm', 'engines'] as const;
const QUOTE = "'";
const ESCAPED_QUOTE = "''";
const QUOTED_ENTRY = /^'((?:[^']|'')*)':\s*(.*)$/;
const PLAIN_ENTRY = /^([^\s-].*?):(?:\s+(.*))?$/;
const ALIASED_VERSION = /^[^(]*@/;
const INDENT_STEP = 2;
const SECTION_DEPTH = 0;
const RECORD_DEPTH = 1;
const FIELD_DEPTH = 2;
const ENTRY_DEPTH = 3;
const VERSION_KEY = 'version';

export type Dependencies = ReadonlyMap<string, string>;

export interface Lockfile {
  readonly settings: string;
  readonly importers: ReadonlyMap<string, Dependencies>;
  readonly snapshots: ReadonlyMap<string, Dependencies>;
}

interface Entry {
  readonly depth: number;
  readonly key: string;
  readonly value: string;
}

function unquote(text: string): string {
  if (text.length >= QUOTE.length * 2 && text.startsWith(QUOTE) && text.endsWith(QUOTE)) {
    return text.slice(QUOTE.length, -QUOTE.length).replaceAll(ESCAPED_QUOTE, QUOTE);
  }
  return text;
}

function measureIndent(line: string): number {
  return line.length - line.trimStart().length;
}

export function readEntry(line: string): Entry | null {
  const match = QUOTED_ENTRY.exec(line.trim()) ?? PLAIN_ENTRY.exec(line.trim());
  if (match === null) return null;
  return {
    depth: measureIndent(line) / INDENT_STEP,
    key: String(match[1]).replaceAll(ESCAPED_QUOTE, QUOTE),
    value: unquote(match[2] ?? ''),
  };
}

function readSectionName(line: string): SectionName {
  const entry = readEntry(line);
  return entry?.depth === SECTION_DEPTH ? entry.key : undefined;
}

export function parseLockfile(text: string): Lockfile {
  const settings: string[] = [];
  const importers = new Map<string, Map<string, string>>();
  const snapshots = new Map<string, Map<string, string>>();
  const tables = new Map<SectionName, Map<string, Map<string, string>>>([
    ['importers', importers],
    ['snapshots', snapshots],
  ]);
  let section: SectionName;
  let field: SectionName;
  let name: string | undefined;
  let record = new Map<string, string>();
  for (const line of text.split('\n')) {
    section = readSectionName(line) ?? section;
    if (!GRAPH_SECTIONS.has(section)) settings.push(line);
    const table = tables.get(section);
    const entry = readEntry(line);
    if (table === undefined || entry === null) continue;
    if (entry.depth === RECORD_DEPTH) {
      record = new Map();
      table.set(entry.key, record);
    } else if (entry.depth === FIELD_DEPTH) {
      field = entry.key;
    } else if (DEPENDENCY_FIELDS.has(field) && entry.depth === ENTRY_DEPTH) {
      name = entry.key;
      record.set(name, entry.value);
    } else if (DEPENDENCY_FIELDS.has(field) && entry.key === VERSION_KEY) {
      record.set(String(name), entry.value);
    }
  }
  return { settings: settings.join('\n'), importers, snapshots };
}

export function resolveSnapshotKey(name: string, version: string): string {
  return ALIASED_VERSION.test(version) ? version : `${name}@${version}`;
}

function listImporterSuccessors(importerPath: string, dependencies: Dependencies): string[] {
  return [...dependencies].map(([name, version]) =>
    version.startsWith(LINK_PREFIX)
      ? `${IMPORTER_MARKER}${posix.join(importerPath, version.slice(LINK_PREFIX.length))}`
      : resolveSnapshotKey(name, version),
  );
}

function listSnapshotSuccessors(dependencies: Dependencies): string[] {
  return [...dependencies].map(([name, version]) => resolveSnapshotKey(name, version));
}

function listSuccessors(lockfile: Lockfile, node: string): string[] {
  if (!node.startsWith(IMPORTER_MARKER)) {
    return listSnapshotSuccessors(lockfile.snapshots.get(node) ?? new Map());
  }
  const importerPath = node.slice(IMPORTER_MARKER.length);
  return listImporterSuccessors(importerPath, lockfile.importers.get(importerPath) ?? new Map());
}

export function collectClosure(lockfile: Lockfile, importerPath: string): readonly string[] {
  const visited = new Set<string>();
  const pending: string[] = [`${IMPORTER_MARKER}${importerPath}`];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (visited.has(node)) continue;
    visited.add(node);
    pending.push(...listSuccessors(lockfile, node));
  }
  return [...visited].sort();
}

export function stripCatalogs(workspaceText: string): string {
  let section: SectionName;
  return workspaceText
    .split('\n')
    .filter((line) => {
      section = readSectionName(line) ?? section;
      return !CATALOG_SECTIONS.has(section);
    })
    .join('\n');
}

export function pickRootManifestFields(manifest: unknown): string {
  const picked: Record<string, unknown> = {};
  if (typeof manifest === 'object' && manifest !== null) {
    for (const field of ROOT_MANIFEST_FIELDS) picked[field] = Reflect.get(manifest, field);
  }
  return JSON.stringify(picked);
}

export interface DependencyInputs {
  readonly lockfile: Lockfile;
  readonly workspaceSettings: string;
  readonly rootManifestFields: string;
}

export function digestDependencies(inputs: DependencyInputs, importerPath: string): string {
  const hash = createHash('sha256');
  for (const part of [
    inputs.lockfile.settings,
    inputs.workspaceSettings,
    inputs.rootManifestFields,
    ...collectClosure(inputs.lockfile, ROOT_IMPORTER),
    ...collectClosure(inputs.lockfile, importerPath),
  ]) {
    hash.update(part);
    hash.update('\n');
  }
  return hash.digest('hex');
}

export function listChangedImporters(
  before: DependencyInputs,
  after: DependencyInputs,
  importerPaths: readonly string[],
): readonly string[] {
  return importerPaths.filter(
    (path) => digestDependencies(before, path) !== digestDependencies(after, path),
  );
}
