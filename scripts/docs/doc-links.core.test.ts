import { describe, expect, it } from 'vitest';
import { listBrokenLinks, listLinks, readSkipReason } from './doc-links.core';

const isNeverPresent = (): boolean => false;
const isAlwaysPresent = (): boolean => true;

describe('listLinks', () => {
  it('reads the target of every link', () => {
    expect(listLinks('see [one](./a.md) and [two](../b.md)').map((link) => link.target)).toEqual([
      './a.md',
      '../b.md',
    ]);
  });

  it('drops the anchor, which names a heading rather than a file', () => {
    expect(listLinks('[x](./a.md#a-heading)')[0]?.target).toBe('./a.md');
  });

  it('reports the line each link sits on', () => {
    expect(listLinks('one\n\n[x](./a.md)\n[y](./b.md)').map((link) => link.line)).toEqual([3, 4]);
  });

  it('reads nothing inside a backtick fence', () => {
    expect(listLinks('```markdown\n[x](./a.md)\n```')).toEqual([]);
  });

  it('reads nothing inside a tilde fence', () => {
    expect(listLinks('~~~\n[x](./a.md)\n~~~')).toEqual([]);
  });

  it('reads an indented fence, because a fence in a list item is indented', () => {
    expect(listLinks('  ```\n  [x](./a.md)\n  ```')).toEqual([]);
  });

  it('resumes after a fence closes', () => {
    const links = listLinks('```\n[fenced](./a.md)\n```\n[prose](./b.md)');
    expect(links.map((link) => link.target)).toEqual(['./b.md']);
  });

  it('keeps the line numbers of prose after a fence', () => {
    expect(listLinks('```\n[a](./a.md)\n```\n[b](./b.md)')[0]?.line).toBe(4);
  });

  it('finds no link in a document that has none', () => {
    expect(listLinks('just words')).toEqual([]);
  });
});

describe('readSkipReason', () => {
  it('skips an http target', () => {
    expect(readSkipReason('http://example.com')).toBe('absolute');
  });

  it('skips an https target', () => {
    expect(readSkipReason('https://example.com')).toBe('absolute');
  });

  it('skips a mailto target', () => {
    expect(readSkipReason('mailto:someone@example.com')).toBe('absolute');
  });

  it('skips an ftp target', () => {
    expect(readSkipReason('ftp://example.com/x')).toBe('absolute');
  });

  it('skips a bare anchor, which names a heading in this document', () => {
    expect(readSkipReason('#a-heading')).toBe('anchor');
  });

  it('skips a curly placeholder', () => {
    expect(readSkipReason('docs/features/{{app}}/spec.md')).toBe('placeholder');
  });

  it('skips an angle placeholder', () => {
    expect(readSkipReason('docs/features/<app>/spec.md')).toBe('placeholder');
  });

  it('skips an ellipsis placeholder', () => {
    expect(readSkipReason('…/technical-validation-….md')).toBe('placeholder');
  });

  it('skips the ADR numbering placeholder', () => {
    expect(readSkipReason('../../adr/NNNN-slug.md')).toBe('placeholder');
  });

  it('skips a link GitHub resolves against the repository', () => {
    expect(readSkipReason('../../commit/663267998ba86c91d5e91817831547e85090fcf5')).toBe(
      'github-relative',
    );
  });

  it('skips every GitHub route, not only commits', () => {
    for (const route of ['commits', 'pull', 'issues', 'compare', 'releases', 'tree', 'blob']) {
      expect(readSkipReason(`../../${route}/12`)).toBe('github-relative');
    }
  });

  it('skips a word that names no file, e.g. a template saying `url`', () => {
    expect(readSkipReason('url')).toBe('not-a-path');
  });

  it('checks a path in this repository', () => {
    expect(readSkipReason('../knowledge/thing.md')).toBeNull();
  });

  it('checks a bare file name, which has an extension and so names a file', () => {
    expect(readSkipReason('thing.md')).toBeNull();
  });

  it('checks a path with no extension, because a directory is a target', () => {
    expect(readSkipReason('./docs/standards')).toBeNull();
  });

  it('does not read `commit` inside a word as a GitHub route', () => {
    expect(readSkipReason('./precommitment/notes.md')).toBeNull();
  });
});

describe('listBrokenLinks', () => {
  it('reports a link whose target is absent', () => {
    expect(
      listBrokenLinks({ path: 'docs/a.md', markdown: '[x](./gone.md)' }, isNeverPresent),
    ).toEqual([{ document: 'docs/a.md', line: 1, target: './gone.md' }]);
  });

  it('reports nothing when every target resolves', () => {
    expect(
      listBrokenLinks({ path: 'docs/a.md', markdown: '[x](./here.md)' }, isAlwaysPresent),
    ).toEqual([]);
  });

  it('reports nothing for a link it skips, even when nothing resolves', () => {
    expect(
      listBrokenLinks({ path: 'docs/a.md', markdown: '[x](https://e.com)' }, isNeverPresent),
    ).toEqual([]);
  });

  it('asks about the target from the document that holds it', () => {
    const asked: string[] = [];
    listBrokenLinks({ path: 'docs/a.md', markdown: '[x](./b.md)' }, (documentPath, target) => {
      asked.push(`${documentPath} ${target}`);
      return true;
    });
    expect(asked).toEqual(['docs/a.md ./b.md']);
  });
});
