/**
 * @DependsOnExternal github
 */

import { TalosError } from '../helpers/errors/talos-error.types';
import type { ContentStore, FileEditor } from './content.types';
import {
  BLOB_BATCH_SIZE,
  buildBlobQuery,
  buildContentsUrl,
  buildGithubHeaders,
  buildTreeUrl,
  buildWriteBody,
  type CachedResponse,
  chunkItems,
  classifyWriteStatus,
  GITHUB_API_URL,
  type GithubFile,
  interpretReadAnswer,
  listGithubDirectoryFiles,
  readBlobTexts,
  readGithubFile,
  readGithubTree,
  selectFreshEntry,
} from './github.core';

export type ExternalFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface GithubCache {
  readonly responses: Map<string, CachedResponse>;
  readonly blobs: Map<string, string>;
}

export interface GithubContentOptions {
  readonly repository: string;
  readonly readToken: () => Promise<string | undefined>;
  readonly branch?: string;
  readonly fetcher?: ExternalFetcher;
  readonly now?: () => number;
  readonly cache?: GithubCache;
}

interface GithubSettings {
  readonly repository: string;
  readonly readToken: () => Promise<string | undefined>;
  readonly branch: string;
  readonly fetcher: ExternalFetcher;
  readonly now: () => number;
  readonly cache: GithubCache;
}

interface GithubAnswer {
  readonly status: number;
  readonly body: unknown;
}

const DEFAULT_BRANCH = 'main';
const CACHE_LIFETIME_MILLISECONDS = 30_000;
const GRAPHQL_URL = `${GITHUB_API_URL}/graphql`;
const MAXIMUM_WRITE_ATTEMPTS = 2;

const sharedCache: GithubCache = { responses: new Map(), blobs: new Map() };

async function askGithub(
  settings: GithubSettings,
  url: string,
  init: RequestInit = {},
): Promise<GithubAnswer> {
  const token = await settings.readToken();
  if (token === undefined) throw new TalosError('not-configured');
  const response = await settings.fetcher(url, {
    ...init,
    headers: buildGithubHeaders(token),
  });
  const body: unknown = await response.json().catch(() => undefined);
  return { status: response.status, body };
}

async function askGithubThroughCache(settings: GithubSettings, url: string): Promise<GithubAnswer> {
  const fresh = selectFreshEntry(settings.cache.responses.get(url), settings.now());
  if (fresh !== null) return fresh;
  const answer = await askGithub(settings, url);
  settings.cache.responses.set(url, {
    ...answer,
    expiresAt: settings.now() + CACHE_LIFETIME_MILLISECONDS,
  });
  return answer;
}

function readFoundBody(answer: GithubAnswer): unknown {
  const readable = interpretReadAnswer(answer.status, answer.body);
  if (readable.kind === 'failed') throw new TalosError('content-unavailable');
  return readable.body;
}

async function readFile(settings: GithubSettings, path: string): Promise<string | null> {
  const url = buildContentsUrl(settings.repository, path, settings.branch);
  const file = readGithubFile(readFoundBody(await askGithubThroughCache(settings, url)));
  return file?.content ?? null;
}

async function listDirectory(settings: GithubSettings, directory: string): Promise<string[]> {
  const url = buildContentsUrl(settings.repository, directory, settings.branch);
  return listGithubDirectoryFiles(readFoundBody(await askGithubThroughCache(settings, url)));
}

async function readTree(settings: GithubSettings) {
  const url = buildTreeUrl(settings.repository, settings.branch);
  return readGithubTree(readFoundBody(await askGithubThroughCache(settings, url)));
}

async function fetchMissingBlobs(settings: GithubSettings, shas: readonly string[]) {
  for (const batch of chunkItems(shas, BLOB_BATCH_SIZE)) {
    const answer = await askGithub(settings, GRAPHQL_URL, {
      method: 'POST',
      body: buildBlobQuery(settings.repository, batch),
    });
    for (const [sha, text] of readBlobTexts(answer.body, batch)) {
      settings.cache.blobs.set(sha, text);
    }
  }
}

async function readFiles(
  settings: GithubSettings,
  paths: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const wanted = new Set(paths);
  const blobs = (await readTree(settings)).filter((blob) => wanted.has(blob.path));
  const missingShas = blobs.map((blob) => blob.sha).filter((sha) => !settings.cache.blobs.has(sha));
  await fetchMissingBlobs(settings, [...new Set(missingShas)]);
  const texts = new Map<string, string>();
  for (const blob of blobs) {
    const text = settings.cache.blobs.get(blob.sha);
    if (text !== undefined) texts.set(blob.path, text);
  }
  return texts;
}

async function readFileForWriting(
  settings: GithubSettings,
  path: string,
): Promise<GithubFile | null> {
  const url = buildContentsUrl(settings.repository, path, settings.branch);
  return readGithubFile(readFoundBody(await askGithub(settings, url)));
}

async function attemptEdit<Outcome>(
  settings: GithubSettings,
  path: string,
  editor: FileEditor<Outcome>,
  attempt: number,
): Promise<Outcome> {
  const current = await readFileForWriting(settings, path);
  const edit = editor(current?.content ?? null);
  if (edit.content === null) return edit.outcome;
  const url = buildContentsUrl(settings.repository, path, settings.branch);
  const answer = await askGithub(settings, url, {
    method: 'PUT',
    body: buildWriteBody({
      message: edit.commitMessage,
      content: edit.content,
      sha: current?.sha ?? null,
      branch: settings.branch,
    }),
  });
  const kind = classifyWriteStatus(answer.status);
  settings.cache.responses.clear();
  if (kind === 'written') return edit.outcome;
  if (kind === 'failed') throw new TalosError('content-unavailable');
  if (attempt >= MAXIMUM_WRITE_ATTEMPTS) throw new TalosError('content-conflict');
  return await attemptEdit(settings, path, editor, attempt + 1);
}

// @FollowsBlueprint adapter-credentialed-lookup
export function createGithubContentStore(options: GithubContentOptions): ContentStore {
  const settings: GithubSettings = {
    repository: options.repository,
    readToken: options.readToken,
    branch: options.branch ?? DEFAULT_BRANCH,
    fetcher: options.fetcher ?? fetch,
    now: options.now ?? Date.now,
    cache: options.cache ?? sharedCache,
  };
  return {
    readFile: async (path) => await readFile(settings, path),
    listDirectory: async (directory) => await listDirectory(settings, directory),
    listFiles: async () => (await readTree(settings)).map((blob) => blob.path),
    readFiles: async (paths) => await readFiles(settings, paths),
    editFile: async (path, editor) => await attemptEdit(settings, path, editor, 1),
  };
}
