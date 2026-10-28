import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGE_LIMIT,
  escapeMarkdown,
  fitFolderToBudget,
  folderUrl,
  GALLERY_HEADING,
  galleryHost,
  groupIntoFolders,
  layOutFolder,
  renderEmptyGallery,
  renderGallery,
  screenshotPrefix,
  screenshotUrl,
  type StoredObject,
} from './screenshot-gallery.core';

const PULL_REQUEST = 207;
const PREFIX = 'screenshots/pr-207/';
const EARLY = '2026-10-27T10:00:00+00:00';
const LATE = '2026-10-27T23:00:00+00:00';

function stored(relativeKey: string, lastModified = EARLY): StoredObject {
  return { key: `${PREFIX}${relativeKey}`, lastModified };
}

function shot(file: string, lastModified = EARLY) {
  return { file, lastModified };
}

describe('addresses', () => {
  it('builds the bucket prefix and the CDN host from the pull request number', () => {
    expect(screenshotPrefix(12)).toBe('screenshots/pr-12/');
    expect(galleryHost(12)).toBe('https://screenshots-pr-12.preview.borso.fr');
  });

  it('links a folder with a trailing slash so the CDN serves its index page', () => {
    expect(folderUrl(12, 'run-1')).toBe('https://screenshots-pr-12.preview.borso.fr/run-1/');
    expect(folderUrl(12, '')).toBe('https://screenshots-pr-12.preview.borso.fr/');
  });

  it('encodes each path segment but keeps the separators', () => {
    expect(screenshotUrl(12, 'a b/c', 'd e.png')).toBe(
      'https://screenshots-pr-12.preview.borso.fr/a%20b/c/d%20e.png',
    );
  });
});

describe('escapeMarkdown', () => {
  it('escapes the characters that would break a table cell or a link label', () => {
    expect(escapeMarkdown('a|b[c]_d*e`f<g>h\\i')).toBe('a\\|b\\[c\\]\\_d\\*e\\`f\\<g\\>h\\\\i');
  });

  it('leaves ordinary file names alone', () => {
    expect(escapeMarkdown('21-tasks-375-dark')).toBe('21-tasks-375-dark');
  });
});

describe('groupIntoFolders', () => {
  it('keeps only PNG files under the prefix', () => {
    const folders = groupIntoFolders(
      [
        stored('run/a.png'),
        stored('run/index.html'),
        { key: 'screenshots/pr-2070/run/b.png', lastModified: EARLY },
        { key: 'architecture/pr-207/c.png', lastModified: EARLY },
      ],
      PREFIX,
    );
    expect(folders).toEqual([{ path: 'run', newest: EARLY, screenshots: [shot('a.png')] }]);
  });

  it('puts the folder holding the newest file first', () => {
    const folders = groupIntoFolders(
      [stored('old/a.png', EARLY), stored('new/a.png', EARLY), stored('new/b.png', LATE)],
      PREFIX,
    );
    expect(folders.map((folder) => folder.path)).toEqual(['new', 'old']);
    expect(folders[0]?.newest).toBe(LATE);
  });

  it('dates a folder by its newest file whatever order the listing gives', () => {
    const [folder] = groupIntoFolders(
      [stored('run/b.png', LATE), stored('run/a.png', EARLY)],
      PREFIX,
    );
    expect(folder?.newest).toBe(LATE);
  });

  it('breaks a tie on upload time by the later folder name', () => {
    const folders = groupIntoFolders(
      [stored('2026-01-01/a.png'), stored('2026-02-01/a.png')],
      PREFIX,
    );
    expect(folders.map((folder) => folder.path)).toEqual(['2026-02-01', '2026-01-01']);
  });

  it('sorts files by name inside a folder', () => {
    const [folder] = groupIntoFolders([stored('run/b.png'), stored('run/a.png')], PREFIX);
    expect(folder?.screenshots.map((screenshot) => screenshot.file)).toEqual(['a.png', 'b.png']);
  });

  it('groups a file with no folder under the empty path, and nested folders by their full path', () => {
    const folders = groupIntoFolders([stored('loose.png'), stored('run/deep/a.png', LATE)], PREFIX);
    expect(folders.map((folder) => folder.path)).toEqual(['run/deep', '']);
  });
});

describe('layOutFolder', () => {
  it('pairs before and after files that share a subject', () => {
    const layout = layOutFolder([
      shot('after-band.png'),
      shot('after-lonely.png'),
      shot('before-band.png'),
      shot('before-orphan.png'),
      shot('plain.png'),
    ]);
    expect(layout.pairs).toEqual([
      { subject: 'band', before: shot('before-band.png'), after: shot('after-band.png') },
    ]);
    expect(layout.singles.map((screenshot) => screenshot.file)).toEqual([
      'after-lonely.png',
      'before-orphan.png',
      'plain.png',
    ]);
  });
});

describe('layOutFolder, names that only look like a pair', () => {
  it('pairs only files that really carry the before- and after- prefixes', () => {
    const layout = layOutFolder([
      shot('after-band.png'),
      shot('before-band.png'),
      shot('zzzzzzband.png'),
      shot('zzzzzzzband.png'),
    ]);
    expect(layout.pairs).toEqual([
      { subject: 'band', before: shot('before-band.png'), after: shot('after-band.png') },
    ]);
    expect(layout.singles.map((screenshot) => screenshot.file)).toEqual([
      'zzzzzzband.png',
      'zzzzzzzband.png',
    ]);
  });
});

describe('fitFolderToBudget', () => {
  const layout = {
    pairs: [
      { subject: 'a', before: shot('before-a.png'), after: shot('after-a.png') },
      { subject: 'b', before: shot('before-b.png'), after: shot('after-b.png') },
    ],
    singles: [shot('x.png'), shot('y.png')],
  };

  it('keeps everything when the budget allows', () => {
    expect(fitFolderToBudget(layout, 10)).toEqual({ layout, shown: 6, total: 6 });
  });

  it('never splits a pair, and fills what is left with single images', () => {
    const fitted = fitFolderToBudget(layout, 3);
    expect(fitted.layout.pairs.map((pair) => pair.subject)).toEqual(['a']);
    expect(fitted.layout.singles).toEqual([shot('x.png')]);
    expect(fitted).toMatchObject({ shown: 3, total: 6 });
  });

  it('shows nothing once the budget is spent, even below zero', () => {
    expect(fitFolderToBudget(layout, 0)).toMatchObject({ shown: 0, total: 6 });
    expect(fitFolderToBudget(layout, -1)).toMatchObject({ shown: 0, total: 6 });
  });
});

describe('renderEmptyGallery', () => {
  it('says the prefix is empty and why it can be', () => {
    expect(renderEmptyGallery(5)).toBe(
      [
        GALLERY_HEADING,
        '',
        'No screenshots are published under `screenshots/pr-5/` any more. The previews bucket deletes them 60 days after upload.',
      ].join('\n'),
    );
  });
});

describe('renderGallery', () => {
  it('falls back to the empty message when the prefix holds no PNG', () => {
    expect(
      renderGallery({
        pullRequestNumber: PULL_REQUEST,
        imageLimit: DEFAULT_IMAGE_LIMIT,
        objects: [stored('run/index.html')],
      }),
    ).toBe(renderEmptyGallery(PULL_REQUEST));
  });

  it('renders a before and after table and a two-per-row table under each folder heading', () => {
    const body = renderGallery({
      pullRequestNumber: PULL_REQUEST,
      imageLimit: DEFAULT_IMAGE_LIMIT,
      objects: [
        stored('compare/before-band.png', LATE),
        stored('compare/after-band.png', LATE),
        stored('run/a.png'),
        stored('run/b.png'),
        stored('run/c.png'),
      ],
    });
    const host = 'https://screenshots-pr-207.preview.borso.fr';
    expect(body).toBe(
      [
        GALLERY_HEADING,
        '',
        '<sub>5 images from 2 folders, newest folder first. The previews bucket deletes them 60 days after upload.</sub>',
        '',
        `#### [compare](${host}/compare/)`,
        '',
        '| Before | After |',
        '| --- | --- |',
        `| ![before-band](${host}/compare/before-band.png)<br><sub>before-band</sub> | ![after-band](${host}/compare/after-band.png)<br><sub>after-band</sub> |`,
        '',
        `#### [run](${host}/run/)`,
        '',
        '|   |   |',
        '| --- | --- |',
        `| ![a](${host}/run/a.png)<br><sub>a</sub> | ![b](${host}/run/b.png)<br><sub>b</sub> |`,
        `| ![c](${host}/run/c.png)<br><sub>c</sub> |   |`,
      ].join('\n'),
    );
  });

  it('caps the images, says how many were dropped, and links every folder that lost some', () => {
    const body = renderGallery({
      pullRequestNumber: PULL_REQUEST,
      imageLimit: 1,
      objects: [stored('new/a.png', LATE), stored('new/b.png', LATE), stored('old/c.png')],
    });
    const host = 'https://screenshots-pr-207.preview.borso.fr';
    expect(body).toBe(
      [
        GALLERY_HEADING,
        '',
        '<sub>1 of 3 images from 2 folders, newest folder first. The previews bucket deletes them 60 days after upload.</sub>',
        '',
        `#### [new](${host}/new/)`,
        '',
        '|   |   |',
        '| --- | --- |',
        `| ![a](${host}/new/a.png)<br><sub>a</sub> |   |`,
        '',
        '**Not shown here**, to keep the comment readable: 2 images past the first 1. Each folder link opens the full set.',
        '',
        `- [new](${host}/new/): 1 of 2 shown`,
        `- [old](${host}/old/): 0 of 1 shown`,
      ].join('\n'),
    );
  });

  it('labels a file with no folder and counts a single image without a plural', () => {
    const body = renderGallery({
      pullRequestNumber: PULL_REQUEST,
      imageLimit: DEFAULT_IMAGE_LIMIT,
      objects: [stored('loose.png')],
    });
    expect(body).toContain('<sub>1 image from 1 folder, newest folder first.');
    expect(body).toContain('#### [(top level)](https://screenshots-pr-207.preview.borso.fr/)');
  });

  it('fills a full row without adding an empty one after it', () => {
    const host = 'https://screenshots-pr-207.preview.borso.fr';
    const body = renderGallery({
      pullRequestNumber: PULL_REQUEST,
      imageLimit: DEFAULT_IMAGE_LIMIT,
      objects: [stored('run/a.png'), stored('run/b.png')],
    });
    expect(
      body.endsWith(
        `| ![a](${host}/run/a.png)<br><sub>a</sub> | ![b](${host}/run/b.png)<br><sub>b</sub> |`,
      ),
    ).toBe(true);
  });
});
