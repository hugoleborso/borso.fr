/**
 * @vitest-environment node
 */

import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TalosError } from '../helpers/errors/talos-error.types';
import { createGithubContentStore, type GithubCache } from './github.adapter';

const REPOSITORY = 'owner/content-repo';
const API = 'https://api.github.com';

interface StoredFile {
  content: string;
  sha: string;
}

interface FakeGithub {
  readonly files: Map<string, StoredFile>;
  readonly calls: {
    method: string;
    url: string;
    body: Record<string, unknown>;
    authorization: string;
  }[];
  readonly writeStatuses: number[];
  readStatus: number | null;
  readonly fetcher: (url: string, init: RequestInit) => Promise<Response>;
}

function digest(content: string): string {
  return createHash('sha1').update(content).digest('hex');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function readHeader(init: RequestInit, name: string): string {
  return new Headers(init.headers).get(name) ?? '';
}

function answerContents(github: FakeGithub, path: string): Response {
  const file = github.files.get(path);
  if (file !== undefined) {
    return json({
      type: 'file',
      encoding: 'base64',
      content: Buffer.from(file.content).toString('base64'),
      sha: file.sha,
    });
  }
  const children = [...github.files.keys()].filter((candidate) => candidate.startsWith(`${path}/`));
  if (children.length === 0) return json({ message: 'Not Found' }, 404);
  return json(children.map((child) => ({ type: 'file', path: child })));
}

function answerWrite(github: FakeGithub, path: string, body: Record<string, unknown>): Response {
  const forced = github.writeStatuses.shift();
  if (forced !== undefined) return json({ message: 'forced' }, forced);
  const current = github.files.get(path);
  if (current?.sha !== body.sha) return json({ message: 'sha mismatch' }, 409);
  const content = Buffer.from(String(body.content), 'base64').toString('utf8');
  github.files.set(path, { content, sha: digest(content) });
  return json({ content: { sha: digest(content) } }, current === undefined ? 201 : 200);
}

function answerGraphql(github: FakeGithub, body: Record<string, unknown>): Response {
  const query = String(body.query);
  const repository = Object.fromEntries(
    [...query.matchAll(/(blob\d+): object\(oid: "([0-9a-f]+)"\)/g)].map(([, alias, sha]) => {
      const file = [...github.files.values()].find((candidate) => candidate.sha === sha);
      return [alias, file === undefined ? null : { text: file.content }];
    }),
  );
  return json({ data: { repository } });
}

function buildFakeGithub(initial: Record<string, string>): FakeGithub {
  const github: FakeGithub = {
    files: new Map(
      Object.entries(initial).map(([path, content]) => [path, { content, sha: digest(content) }]),
    ),
    calls: [],
    writeStatuses: [],
    readStatus: null,
    fetcher: async (url, init) => {
      const method = init.method ?? 'GET';
      const body: Record<string, unknown> =
        typeof init.body === 'string' ? JSON.parse(init.body) : {};
      github.calls.push({ method, url, body, authorization: readHeader(init, 'Authorization') });
      if (github.readStatus !== null && method === 'GET') return json({}, github.readStatus);
      if (url === `${API}/graphql`) return answerGraphql(github, body);
      if (url.includes('/git/trees/')) {
        return json({
          tree: [...github.files].map(([path, file]) => ({ type: 'blob', path, sha: file.sha })),
        });
      }
      const path = decodeURIComponent(
        url.replace(`${API}/repos/${REPOSITORY}/contents/`, '').replace(/\?ref=.*$/, ''),
      );
      return await Promise.resolve(
        method === 'PUT' ? answerWrite(github, path, body) : answerContents(github, path),
      );
    },
  };
  return github;
}

function freshCache(): GithubCache {
  return { responses: new Map(), blobs: new Map() };
}

function buildStore(github: FakeGithub, clock = { now: 0 }, token: string | null = 'jeton') {
  return createGithubContentStore({
    repository: REPOSITORY,
    readToken: async () => await Promise.resolve(token ?? undefined),
    fetcher: github.fetcher,
    now: () => clock.now,
    cache: freshCache(),
  });
}

function countCalls(github: FakeGithub, method: string): number {
  return github.calls.filter((call) => call.method === method).length;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// @FollowsBlueprint test-node-adapter
describe('createGithubContentStore', () => {
  it('reads a file with the token and serves it from cache for thirty seconds', async () => {
    const github = buildFakeGithub({ 'todo.md': '# Todo\n' });
    const clock = { now: 1000 };
    const store = buildStore(github, clock);
    expect(await store.readFile('todo.md')).toBe('# Todo\n');
    clock.now = 30_999;
    expect(await store.readFile('todo.md')).toBe('# Todo\n');
    expect(github.calls).toHaveLength(1);
    expect(github.calls[0]).toMatchObject({
      url: `${API}/repos/${REPOSITORY}/contents/todo.md?ref=main`,
      authorization: 'Bearer jeton',
    });
    clock.now = 31_000;
    await store.readFile('todo.md');
    expect(github.calls).toHaveLength(2);
  });

  it('answers null for a missing file', async () => {
    expect(await buildStore(buildFakeGithub({})).readFile('absent.md')).toBeNull();
  });

  it('answers null when GitHub answers something that is not a file', async () => {
    const github = buildFakeGithub({});
    const store = createGithubContentStore({
      repository: REPOSITORY,
      readToken: async () => await Promise.resolve('jeton'),
      fetcher: async () => await Promise.resolve(new Response('pas du json', { status: 200 })),
      cache: freshCache(),
    });
    expect(await store.readFile('todo.md')).toBeNull();
    expect(github.calls).toHaveLength(0);
  });

  it('refuses to read when GitHub fails', async () => {
    const github = buildFakeGithub({ 'todo.md': 'x' });
    github.readStatus = 500;
    await expect(buildStore(github).readFile('todo.md')).rejects.toEqual(
      new TalosError('content-unavailable'),
    );
  });

  it('refuses to call GitHub without a token', async () => {
    const github = buildFakeGithub({ 'todo.md': 'x' });
    await expect(buildStore(github, { now: 0 }, null).readFile('todo.md')).rejects.toEqual(
      new TalosError('not-configured'),
    );
    expect(github.calls).toHaveLength(0);
  });

  it('lists the files of a directory, and nothing for a missing one', async () => {
    const store = buildStore(buildFakeGithub({ 'etat/propositions/a.md': 'a', 'todo.md': 't' }));
    expect(await store.listDirectory('etat/propositions')).toEqual(['etat/propositions/a.md']);
    expect(await store.listDirectory('boite/messages')).toEqual([]);
  });

  it('lists every file of the repository from the recursive tree', async () => {
    const github = buildFakeGithub({ 'todo.md': 't', 'second-brain/moi.md': 'h' });
    expect(await buildStore(github).listFiles()).toEqual(['todo.md', 'second-brain/moi.md']);
    expect(github.calls[0]?.url).toBe(`${API}/repos/${REPOSITORY}/git/trees/main?recursive=1`);
  });

  it('reads many files in batches of a hundred and keeps their texts by sha', async () => {
    const initial = Object.fromEntries(
      Array.from({ length: 101 }, (_, index) => [
        `second-brain/p${String(index)}.md`,
        `page ${String(index)}`,
      ]),
    );
    const github = buildFakeGithub(initial);
    const store = buildStore(github);
    const texts = await store.readFiles([...Object.keys(initial), 'absent.md']);
    expect(texts.size).toBe(101);
    expect(texts.get('second-brain/p100.md')).toBe('page 100');
    expect(countCalls(github, 'POST')).toBe(2);
    expect([...(await store.readFiles(['second-brain/p0.md']))]).toEqual([
      ['second-brain/p0.md', 'page 0'],
    ]);
    expect(countCalls(github, 'POST')).toBe(2);
  });

  it('leaves out a blob GitHub cannot give as text', async () => {
    const github = buildFakeGithub({ 'image.md': 'binaire' });
    const store = createGithubContentStore({
      repository: REPOSITORY,
      readToken: async () => await Promise.resolve('jeton'),
      fetcher: async (url, init) =>
        url.endsWith('/graphql')
          ? await Promise.resolve(json({ data: { repository: { blob0: { text: null } } } }))
          : await github.fetcher(url, init),
      cache: freshCache(),
    });
    expect((await store.readFiles(['image.md'])).size).toBe(0);
  });

  it('asks for a blob shared by two paths only once', async () => {
    const github = buildFakeGithub({ 'a.md': 'même', 'b.md': 'même' });
    const texts = await buildStore(github).readFiles(['a.md', 'b.md']);
    expect([...texts]).toEqual([
      ['a.md', 'même'],
      ['b.md', 'même'],
    ]);
    expect(String(github.calls.at(-1)?.body.query).match(/object\(/g)).toHaveLength(1);
  });

  it('creates a file without a sha and returns the outcome of the edit', async () => {
    const github = buildFakeGithub({});
    const outcome = await buildStore(github).editFile('boite/messages/m.md', (current) => ({
      content: `${current ?? 'vide'}\n`,
      commitMessage: 'pwa : message pour Talos',
      outcome: 'écrit',
    }));
    expect(outcome).toBe('écrit');
    expect(github.files.get('boite/messages/m.md')?.content).toBe('vide\n');
    expect(github.calls.at(-1)).toMatchObject({
      method: 'PUT',
      body: { message: 'pwa : message pour Talos', branch: 'main' },
    });
    expect(github.calls.at(-1)?.body).not.toHaveProperty('sha');
  });

  it('replaces a file with its sha and forgets the cached reads', async () => {
    const github = buildFakeGithub({ 'todo.md': 'avant' });
    const store = buildStore(github);
    await store.readFile('todo.md');
    await store.editFile('todo.md', (current) => ({
      content: `${current ?? ''} après`,
      commitMessage: 'pwa : todo',
      outcome: null,
    }));
    expect(await store.readFile('todo.md')).toBe('avant après');
    expect(github.calls.find((call) => call.method === 'PUT')?.body).toMatchObject({
      sha: digest('avant'),
    });
  });

  it('writes nothing when the edit declines', async () => {
    const github = buildFakeGithub({ 'todo.md': 'x' });
    const outcome = await buildStore(github).editFile('todo.md', () => ({
      content: null,
      outcome: 'introuvable',
    }));
    expect(outcome).toBe('introuvable');
    expect(countCalls(github, 'PUT')).toBe(0);
  });

  it('re-reads and re-applies the edit once after a conflict', async () => {
    const github = buildFakeGithub({ 'todo.md': 'v1' });
    github.writeStatuses.push(409);
    const seen: (string | null)[] = [];
    await buildStore(github).editFile('todo.md', (current) => {
      seen.push(current);
      return { content: `${current ?? ''}+`, commitMessage: 'm', outcome: null };
    });
    expect(seen).toEqual(['v1', 'v1']);
    expect(github.files.get('todo.md')?.content).toBe('v1+');
  });

  it('gives up after a second conflict', async () => {
    const github = buildFakeGithub({ 'todo.md': 'v1' });
    github.writeStatuses.push(409, 409);
    await expect(
      buildStore(github).editFile('todo.md', () => ({
        content: 'v2',
        commitMessage: 'm',
        outcome: null,
      })),
    ).rejects.toEqual(new TalosError('content-conflict'));
    expect(countCalls(github, 'PUT')).toBe(2);
  });

  it('refuses a write GitHub rejects for another reason', async () => {
    const github = buildFakeGithub({ 'todo.md': 'v1' });
    github.writeStatuses.push(422);
    await expect(
      buildStore(github).editFile('todo.md', () => ({
        content: 'v2',
        commitMessage: 'm',
        outcome: null,
      })),
    ).rejects.toEqual(new TalosError('content-unavailable'));
  });

  it('uses the global fetch, the real clock and a shared cache by default', async () => {
    const github = buildFakeGithub({ 'focus.md': 'focus' });
    vi.stubGlobal('fetch', github.fetcher);
    const store = createGithubContentStore({
      repository: REPOSITORY,
      readToken: async () => await Promise.resolve('jeton'),
    });
    expect(await store.readFile('focus.md')).toBe('focus');
    expect(await store.readFile('focus.md')).toBe('focus');
    expect(github.calls).toHaveLength(1);
  });

  it('reads another branch when asked', async () => {
    const github = buildFakeGithub({ 'focus.md': 'focus' });
    const store = createGithubContentStore({
      repository: REPOSITORY,
      readToken: async () => await Promise.resolve('jeton'),
      branch: 'essai',
      fetcher: github.fetcher,
      cache: freshCache(),
    });
    await store.readFile('focus.md');
    expect(github.calls[0]?.url).toBe(`${API}/repos/${REPOSITORY}/contents/focus.md?ref=essai`);
  });
});
