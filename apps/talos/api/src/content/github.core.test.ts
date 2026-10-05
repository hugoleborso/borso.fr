import { describe, expect, it } from 'vitest';
import {
  buildBlobQuery,
  buildContentsUrl,
  buildGithubHeaders,
  buildTreeUrl,
  buildWriteBody,
  chunkItems,
  classifyWriteStatus,
  interpretReadAnswer,
  listGithubDirectoryFiles,
  readBlobTexts,
  readGithubFile,
  readGithubTree,
  selectFreshEntry,
} from './github.core';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

describe('GitHub urls', () => {
  it('encodes each path segment of a contents url and keeps the slashes', () => {
    expect(buildContentsUrl('owner/content-repo', 'second-brain/personnes/é t.md', 'main')).toBe(
      'https://api.github.com/repos/owner/content-repo/contents/second-brain/personnes/%C3%A9%20t.md?ref=main',
    );
  });

  it('asks for the recursive tree of the branch', () => {
    expect(buildTreeUrl('owner/content-repo', 'main')).toBe(
      'https://api.github.com/repos/owner/content-repo/git/trees/main?recursive=1',
    );
  });

  it('sends the token, the media type and the api version', () => {
    expect(buildGithubHeaders('jeton')).toEqual({
      Authorization: 'Bearer jeton',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'talos-pwa',
    });
  });
});

describe('interpretReadAnswer', () => {
  it('reads a missing file as an empty body', () => {
    expect(interpretReadAnswer(404, { message: 'Not Found' })).toEqual({
      kind: 'readable',
      body: null,
    });
  });

  it('passes a successful body through', () => {
    expect(interpretReadAnswer(200, { a: 1 })).toEqual({ kind: 'readable', body: { a: 1 } });
    expect(interpretReadAnswer(299, 'x')).toEqual({ kind: 'readable', body: 'x' });
  });

  it.each([[199], [300], [401], [500]])('fails on status %i', (status) => {
    expect(interpretReadAnswer(status, null)).toEqual({ kind: 'failed' });
  });
});

describe('classifyWriteStatus', () => {
  it.each([
    [200, 'written'],
    [201, 'written'],
    [409, 'conflict'],
    [422, 'failed'],
    [199, 'failed'],
    [300, 'failed'],
  ])('classifies %i as %s', (status, kind) => {
    expect(classifyWriteStatus(status)).toBe(kind);
  });
});

describe('readGithubFile', () => {
  it('decodes a base64 file and keeps its sha', () => {
    const content = Buffer.from('Échéance\n', 'utf8').toString('base64');
    expect(
      readGithubFile({ type: 'file', encoding: 'base64', content: `${content}\n`, sha: SHA_A }),
    ).toEqual({ content: 'Échéance\n', sha: SHA_A });
  });

  it('answers null for a directory or anything else', () => {
    expect(readGithubFile([{ type: 'file' }])).toBeNull();
    expect(readGithubFile(null)).toBeNull();
  });
});

describe('listGithubDirectoryFiles', () => {
  it('keeps the files of a directory listing', () => {
    expect(
      listGithubDirectoryFiles([
        { type: 'file', path: 'etat/propositions/a.md' },
        { type: 'dir', path: 'etat/propositions/archives' },
      ]),
    ).toEqual(['etat/propositions/a.md']);
  });

  it('answers an empty list for a missing directory', () => {
    expect(listGithubDirectoryFiles(null)).toEqual([]);
  });
});

describe('readGithubTree', () => {
  it('keeps the blobs with a well-formed sha', () => {
    expect(
      readGithubTree({
        tree: [
          { type: 'blob', path: 'todo.md', sha: SHA_A },
          { type: 'tree', path: 'journal', sha: SHA_B },
          { type: 'blob', path: 'bizarre', sha: 'pas-un-sha' },
        ],
      }),
    ).toEqual([{ path: 'todo.md', sha: SHA_A }]);
  });

  it('answers an empty list for an unexpected body', () => {
    expect(readGithubTree({ message: 'Bad credentials' })).toEqual([]);
  });
});

describe('buildWriteBody', () => {
  it('encodes the content and names the sha it replaces', () => {
    expect(
      JSON.parse(buildWriteBody({ message: 'pwa : x', content: 'é', sha: SHA_A, branch: 'main' })),
    ).toEqual({ message: 'pwa : x', content: 'w6k=', branch: 'main', sha: SHA_A });
  });

  it('omits the sha when the file is new', () => {
    expect(
      JSON.parse(buildWriteBody({ message: 'm', content: '', sha: null, branch: 'main' })),
    ).toEqual({ message: 'm', content: '', branch: 'main' });
  });
});

describe('buildBlobQuery', () => {
  it('asks for every blob text under an alias in one GraphQL query', () => {
    expect(JSON.parse(buildBlobQuery('owner/content-repo', [SHA_A, SHA_B]))).toEqual({
      query: `query { repository(owner: "owner", name: "content-repo") { blob0: object(oid: "${SHA_A}") { ... on Blob { text } } blob1: object(oid: "${SHA_B}") { ... on Blob { text } } } }`,
    });
  });
});

describe('readBlobTexts', () => {
  it('maps each alias back to its sha and skips binary or missing blobs', () => {
    const texts = readBlobTexts(
      { data: { repository: { blob0: { text: 'un' }, blob1: { text: null }, blob2: null } } },
      [SHA_A, SHA_B, 'c'.repeat(40)],
    );
    expect([...texts]).toEqual([[SHA_A, 'un']]);
  });

  it('answers nothing for an error body', () => {
    expect(readBlobTexts({ errors: [] }, [SHA_A]).size).toBe(0);
  });
});

describe('chunkItems', () => {
  it('cuts a list into batches of the given size', () => {
    expect(chunkItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkItems([], 2)).toEqual([]);
  });
});

describe('selectFreshEntry', () => {
  const entry = { status: 200, body: null, expiresAt: 1000 };

  it('keeps an entry before its expiry', () => {
    expect(selectFreshEntry(entry, 999)).toBe(entry);
  });

  it('drops an entry at its expiry or when nothing is cached', () => {
    expect(selectFreshEntry(entry, 1000)).toBeNull();
    expect(selectFreshEntry(undefined, 0)).toBeNull();
  });
});
