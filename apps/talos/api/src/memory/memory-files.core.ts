export type MemoryFileKind = 'proposal' | 'draft' | 'commitment' | 'journal' | 'state' | 'page';

export interface MemoryFileAddress {
  readonly kind: MemoryFileKind;
  readonly key: string;
}

const MARKDOWN_EXTENSION = '.md';
const PATH_SEPARATOR = '/';
const JSON_INDENTATION = 2;

const RECORD_DIRECTORIES: readonly (readonly [string, MemoryFileKind])[] = [
  ['etat/propositions', 'proposal'],
  ['etat/brouillons', 'draft'],
  ['engagements', 'commitment'],
  ['journal', 'journal'],
];

const STATE_FILES: ReadonlyMap<string, string> = new Map([
  ['etat/relations.json', 'relations'],
  ['etat/dernier-scan.json', 'last_scan'],
]);

function isDirectChild(slug: string, directory: string): boolean {
  const prefix = `${directory}${PATH_SEPARATOR}`;
  return slug.startsWith(prefix) && !slug.slice(prefix.length).includes(PATH_SEPARATOR);
}

// @FollowsBlueprint core-decision
export function locateMemoryFile(path: string): MemoryFileAddress | null {
  const stateKey = STATE_FILES.get(path);
  if (stateKey !== undefined) return { kind: 'state', key: stateKey };
  if (!path.endsWith(MARKDOWN_EXTENSION)) return null;
  const slug = path.slice(0, -MARKDOWN_EXTENSION.length);
  const directory = RECORD_DIRECTORIES.find(([name]) => isDirectChild(slug, name));
  return { kind: directory?.[1] ?? 'page', key: slug };
}

export function selectDirectoryKind(directory: string): MemoryFileKind | null {
  return RECORD_DIRECTORIES.find(([name]) => name === directory)?.[1] ?? null;
}

export function listDirectoryFiles(directory: string, slugs: readonly string[]): string[] {
  return slugs
    .filter((slug) => isDirectChild(slug, directory))
    .map((slug) => `${slug}${MARKDOWN_EXTENSION}`);
}

export function renderStateFile(value: unknown): string {
  return JSON.stringify(value, null, JSON_INDENTATION);
}
