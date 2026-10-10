import { describe, expect, it } from 'vitest';
import {
  isExplanatoryKey,
  listCopyProblems,
  listExplanatoryKeys,
  listMessagePaths,
} from './explanatory-copy.core';

describe('listMessagePaths', () => {
  it('flattens nested messages into dotted paths', () => {
    expect(
      listMessagePaths({ catalog: { title: 'Catalog', upload: { hint: 'PDF' } }, ok: 'OK' }),
    ).toEqual(['catalog.title', 'catalog.upload.hint', 'ok']);
  });

  it('reads a bare value as one empty path', () => {
    expect(listMessagePaths('text')).toEqual(['']);
    expect(listMessagePaths(null)).toEqual(['']);
  });
});

describe('isExplanatoryKey', () => {
  it.each([
    'catalog.uploadHint',
    'mastery.subtitle',
    'auth.recoverIntro',
    'play.description',
    'form.helper',
    'form.help',
    'page.explanation',
    'vote.instruction',
    'vote.instructions',
    'photo.caption',
    'home.lede',
    'tagline',
    'admin.punch.hint',
  ])('flags %s', (path) => {
    expect(isExplanatoryKey(path)).toBe(true);
  });

  it.each(['catalog.title', 'hint.label', 'subtitleColor.value', 'catalog.newSong'])(
    'leaves %s alone',
    (path) => {
      expect(isExplanatoryKey(path)).toBe(false);
    },
  );
});

describe('listExplanatoryKeys', () => {
  it('prefixes each explanatory path with its application', () => {
    expect(
      listExplanatoryKeys('pragma', { catalog: { title: 'Catalog', uploadHint: 'PDF' } }),
    ).toEqual(['pragma:catalog.uploadHint']);
  });
});

describe('listCopyProblems', () => {
  it('passes a key excepted with a reason', () => {
    expect(listCopyProblems(['pragma:a.hint'], { 'pragma:a.hint': 'a gesture' })).toEqual([]);
  });

  it('refuses a key nobody excepted', () => {
    expect(listCopyProblems(['pragma:a.hint'], {})).toEqual([
      {
        key: 'pragma:a.hint',
        message:
          'names text that explains the interface; change the control, or record why the screen cannot show it',
      },
    ]);
  });

  it('refuses an exception whose reason is blank', () => {
    expect(listCopyProblems(['pragma:a.hint'], { 'pragma:a.hint': '  ' })).toEqual([
      { key: 'pragma:a.hint', message: 'is excepted without a reason' },
    ]);
  });

  it('refuses an exception for a key that is gone', () => {
    expect(listCopyProblems([], { 'pragma:a.hint': 'a gesture' })).toEqual([
      { key: 'pragma:a.hint', message: 'is excepted but no longer exists; remove the exception' },
    ]);
  });

  it('does not read inherited properties as exceptions', () => {
    expect(listCopyProblems(['pragma:toString'], {})).toHaveLength(1);
  });
});
