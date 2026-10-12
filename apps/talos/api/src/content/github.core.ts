import { z } from 'zod';

export const GITHUB_API_URL = 'https://api.github.com';
export const BLOB_BATCH_SIZE = 100;

export interface GithubFile {
  readonly content: string;
  readonly sha: string;
}

export interface GithubBlob {
  readonly path: string;
  readonly sha: string;
}

export interface CachedResponse {
  readonly status: number;
  readonly body: unknown;
  readonly expiresAt: number;
}

export type ReadAnswer =
  { readonly kind: 'failed' } | { readonly kind: 'readable'; readonly body: unknown };
export type WriteKind = 'written' | 'conflict' | 'failed';

const API_VERSION = '2022-11-28';
const USER_AGENT = 'talos-pwa';
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const FIRST_SUCCESS_STATUS = 200;
const FIRST_REDIRECT_STATUS = 300;
const BLOB_SHA_PATTERN = /^[0-9a-f]{40}$/;
const BLOB_ALIAS_PREFIX = 'blob';

const fileSchema = z.object({
  type: z.literal('file'),
  encoding: z.literal('base64'),
  content: z.string(),
  sha: z.string(),
});

const directorySchema = z.array(z.object({ type: z.string(), path: z.string() }));

const treeSchema = z.object({
  tree: z.array(z.object({ type: z.string(), path: z.string(), sha: z.string() })),
});

const blobTextsSchema = z.object({
  data: z.object({
    repository: z.record(z.string(), z.object({ text: z.string().nullable() }).nullable()),
  }),
});

function isSuccess(status: number): boolean {
  return status >= FIRST_SUCCESS_STATUS && status < FIRST_REDIRECT_STATUS;
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function buildContentsUrl(repository: string, path: string, branch: string): string {
  return `${GITHUB_API_URL}/repos/${repository}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`;
}

export function buildTreeUrl(repository: string, branch: string): string {
  return `${GITHUB_API_URL}/repos/${repository}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
}

export function buildGithubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': USER_AGENT,
  };
}

export function interpretReadAnswer(status: number, body: unknown): ReadAnswer {
  if (status === NOT_FOUND_STATUS) return { kind: 'readable', body: null };
  return isSuccess(status) ? { kind: 'readable', body } : { kind: 'failed' };
}

export function classifyWriteStatus(status: number): WriteKind {
  if (status === CONFLICT_STATUS) return 'conflict';
  return isSuccess(status) ? 'written' : 'failed';
}

// @FollowsBlueprint core-external-payload-mapping
export function readGithubFile(body: unknown): GithubFile | null {
  const file = fileSchema.safeParse(body);
  if (!file.success) return null;
  return {
    content: Buffer.from(file.data.content, 'base64').toString('utf8'),
    sha: file.data.sha,
  };
}

export function listGithubDirectoryFiles(body: unknown): string[] {
  const directory = directorySchema.safeParse(body);
  if (!directory.success) return [];
  return directory.data.filter((entry) => entry.type === 'file').map((entry) => entry.path);
}

export function readGithubTree(body: unknown): GithubBlob[] {
  const tree = treeSchema.safeParse(body);
  if (!tree.success) return [];
  return tree.data.tree
    .filter((entry) => entry.type === 'blob' && BLOB_SHA_PATTERN.test(entry.sha))
    .map((entry) => ({ path: entry.path, sha: entry.sha }));
}

export function buildWriteBody(params: {
  readonly message: string;
  readonly content: string;
  readonly sha: string | null;
  readonly branch: string;
}): string {
  return JSON.stringify({
    message: params.message,
    content: Buffer.from(params.content).toString('base64'),
    branch: params.branch,
    ...(params.sha === null ? {} : { sha: params.sha }),
  });
}

export function buildBlobQuery(repository: string, shas: readonly string[]): string {
  const separatorIndex = repository.indexOf('/');
  const owner = repository.slice(0, separatorIndex);
  const name = repository.slice(separatorIndex + 1);
  const aliases = shas
    .map(
      (sha, index) =>
        `${BLOB_ALIAS_PREFIX}${index}: object(oid: "${sha}") { ... on Blob { text } }`,
    )
    .join(' ');
  return JSON.stringify({
    query: `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${aliases} } }`,
  });
}

export function readBlobTexts(body: unknown, shas: readonly string[]): Map<string, string> {
  const blobTexts = blobTextsSchema.safeParse(body);
  const repository = blobTexts.success ? blobTexts.data.data.repository : {};
  const texts = new Map<string, string>();
  shas.forEach((sha, index) => {
    const text = repository[`${BLOB_ALIAS_PREFIX}${index}`]?.text;
    if (typeof text === 'string') texts.set(sha, text);
  });
  return texts;
}

export function chunkItems<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export function selectFreshEntry(
  entry: CachedResponse | undefined,
  nowMillis: number,
): CachedResponse | null {
  if (entry === undefined) return null;
  return entry.expiresAt > nowMillis ? entry : null;
}
