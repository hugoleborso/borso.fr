import { describe, expect, it } from 'vitest';
import {
  buildPageHref,
  convertWikilinksToMarkdown,
  normalisePagePath,
  selectInAppPath,
  selectPageLabel,
} from './wikilinks.core';

describe('normalisePagePath', () => {
  it('drops the markdown extension, the anchor and the leading slashes', () => {
    expect(normalisePagePath(' //second-brain/personnes/lucie.md#faits ')).toBe(
      'second-brain/personnes/lucie',
    );
  });

  it('keeps a path that carries no extension', () => {
    expect(normalisePagePath('index')).toBe('index');
  });

  it('keeps a path whose name only contains md without the dot', () => {
    expect(normalisePagePath('notes/cmd')).toBe('notes/cmd');
  });
});

describe('buildPageHref', () => {
  it('points at the in-app page route', () => {
    expect(buildPageHref('second-brain/moi.md')).toBe('/brain/page/second-brain/moi');
  });

  it('encodes characters a URL cannot carry', () => {
    expect(buildPageHref('a b')).toBe('/brain/page/a%20b');
  });
});

describe('selectPageLabel', () => {
  it('uses the last segment of the path', () => {
    expect(selectPageLabel('second-brain/projets/seville.md')).toBe('seville');
  });

  it('answers the whole name when the path has no folder', () => {
    expect(selectPageLabel('index.md')).toBe('index');
  });
});

describe('convertWikilinksToMarkdown', () => {
  it('turns a bare wikilink into a markdown link named after the page', () => {
    expect(convertWikilinksToMarkdown('voir [[second-brain/projets/seville]] demain')).toBe(
      'voir [seville](/brain/page/second-brain/projets/seville) demain',
    );
  });

  it('uses the alias after the pipe as the label', () => {
    expect(convertWikilinksToMarkdown('[[second-brain/moi| Alex ]]')).toBe(
      '[Alex](/brain/page/second-brain/moi)',
    );
  });

  it('drops the anchor from the destination', () => {
    expect(convertWikilinksToMarkdown('[[second-brain/moi#faits]]')).toBe(
      '[moi](/brain/page/second-brain/moi)',
    );
  });

  it('converts every wikilink on the line', () => {
    expect(convertWikilinksToMarkdown('[[a]] et [[b|B]]')).toBe(
      '[a](/brain/page/a) et [B](/brain/page/b)',
    );
  });

  it('leaves ordinary brackets alone', () => {
    expect(convertWikilinksToMarkdown('[x] et [[]]')).toBe('[x] et [[]]');
  });
});

describe('selectInAppPath', () => {
  it('keeps a link that already points at a page route', () => {
    expect(selectInAppPath('/brain/page/second-brain/moi')).toBe('/brain/page/second-brain/moi');
  });

  it('routes a repository markdown file to its page', () => {
    expect(selectInAppPath('engagements/2026-10-05-cv.md')).toBe(
      '/brain/page/engagements/2026-10-05-cv',
    );
  });

  it('leaves an external link to the browser', () => {
    expect(selectInAppPath('https://example.com/notes.md')).toBeNull();
  });

  it('leaves an anchor to the browser', () => {
    expect(selectInAppPath('#faits.md')).toBeNull();
  });

  it('leaves a link to something other than a markdown file', () => {
    expect(selectInAppPath('/assets/photo.png')).toBeNull();
  });
});
