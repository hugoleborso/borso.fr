const MARKDOWN_EXTENSION = '.md';
const PATH_SEPARATOR = '/';
const CORPUS_FOLDERS = ['second-brain/', 'engagements/', 'objectifs/'];
const READABLE_ONLY_FOLDERS = ['journal/', 'sources/'];
const INDEX_FILE = 'index.md';
const SAFE_PAGE_PATH_PATTERN = /^[\w.-]+(?:\/[\w.-]+)*$/;
const PARENT_SEGMENT = '..';
const SKIPPED_LOCAL_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'vendor',
  'apps',
  'coverage',
  'dist',
  'cdk.out',
  'prive',
  'whatsapp',
]);

function isUnderAny(path: string, folders: readonly string[]): boolean {
  return folders.some((folder) => path.startsWith(folder));
}

// @FollowsBlueprint core-decision
export function isCorpusFile(path: string): boolean {
  if (!path.endsWith(MARKDOWN_EXTENSION)) return false;
  return path === INDEX_FILE || isUnderAny(path, CORPUS_FOLDERS);
}

export function isReadablePagePath(pagePath: string): boolean {
  const isSafe =
    SAFE_PAGE_PATH_PATTERN.test(pagePath) &&
    !pagePath.split(PATH_SEPARATOR).includes(PARENT_SEGMENT);
  const file = `${pagePath}${MARKDOWN_EXTENSION}`;
  return isSafe && (isCorpusFile(file) || isUnderAny(file, READABLE_ONLY_FOLDERS));
}

export function selectDirectoryFiles(paths: readonly string[], directory: string): string[] {
  const prefix = `${directory}${PATH_SEPARATOR}`;
  return paths.filter(
    (path) => path.startsWith(prefix) && !path.slice(prefix.length).includes(PATH_SEPARATOR),
  );
}

export function isSkippedLocalDirectory(name: string): boolean {
  return SKIPPED_LOCAL_DIRECTORIES.has(name);
}
