import { describe, expect, it } from 'vitest';
import en from './en.json';
import fr from './fr.json';
import { diffCatalogs, isInParity, listIdenticalValueKeys } from './i18n-parity.core';

interface IdenticalByDesign {
  readonly key: string;
  readonly readsTheSameBecause: string;
}

const IDENTICAL_BY_DESIGN: readonly IdenticalByDesign[] = [
  { key: 'appName', readsTheSameBecause: 'the Pragma brand' },
  { key: 'bars.contactEmail', readsTheSameBecause: '"Email" is the label French users read too' },
  { key: 'bars.contactName', readsTheSameBecause: 'same word, same spelling' },
  { key: 'bars.notes', readsTheSameBecause: 'same word, same spelling' },
  { key: 'bars.title', readsTheSameBecause: '"un bar" is the same word in French' },
  { key: 'bars.viewKanban', readsTheSameBecause: 'Kanban, a proper noun' },
  { key: 'catalog.album', readsTheSameBecause: 'same word, same spelling' },
  { key: 'catalog.chartImage', readsTheSameBecause: 'same word, same spelling' },
  { key: 'catalog.chartPdf', readsTheSameBecause: 'the PDF format name' },
  { key: 'catalog.chordsPdf', readsTheSameBecause: 'the PDF format name' },
  { key: 'catalog.chordsPhoto', readsTheSameBecause: 'same word, same spelling' },
  {
    key: 'catalog.chordsTextPlaceholder',
    readsTheSameBecause: 'a sample chord chart, lyrics in the language of the song',
  },
  { key: 'catalog.linkPlaceholder', readsTheSameBecause: 'a URL placeholder, not prose' },
  { key: 'catalog.listenDeezer', readsTheSameBecause: 'Deezer, a proper noun' },
  { key: 'catalog.listenSpotify', readsTheSameBecause: 'Spotify, a proper noun' },
  { key: 'catalog.listenYoutube', readsTheSameBecause: 'YouTube, a proper noun' },
  { key: 'catalog.noMastery', readsTheSameBecause: 'an em dash, not a word' },
  {
    key: 'catalog.notesGimmicks',
    readsTheSameBecause: '"gimmick" is the word French musicians use here',
  },
  { key: 'catalog.notesStructure', readsTheSameBecause: 'same word, same spelling' },
  { key: 'catalog.notesTitle', readsTheSameBecause: 'same word, same spelling' },
  { key: 'catalog.tags', readsTheSameBecause: '"tags" is the word French musicians use here' },
  { key: 'common.actions', readsTheSameBecause: 'same word, same spelling' },
  {
    key: 'compos.lineup',
    readsTheSameBecause: 'the band says lineup in French too, and the vocabulary keeps that word',
  },
  {
    key: 'home.totalHoursMinutes',
    readsTheSameBecause: 'a duration written with the h unit both languages share',
  },
  { key: 'home.totalMinutes', readsTheSameBecause: 'min is the minute abbreviation in both' },
  { key: 'instruments.title', readsTheSameBecause: 'same word, same spelling' },
  { key: 'lineup.instruments', readsTheSameBecause: 'same word, same spelling' },
  { key: 'nav.bars', readsTheSameBecause: '"un bar" is the same word in French' },
  { key: 'nav.instruments', readsTheSameBecause: 'same word, same spelling' },
  { key: 'nav.language.en', readsTheSameBecause: 'the EN language tag' },
  { key: 'nav.language.fr', readsTheSameBecause: 'the FR language tag' },
  { key: 'nav.sessions', readsTheSameBecause: 'same word, same spelling' },
  { key: 'notifications.title', readsTheSameBecause: '"Notifications" is spelled alike in French' },
  { key: 'practice.note', readsTheSameBecause: 'same word, same spelling' },
  { key: 'practice.noteTitle', readsTheSameBecause: 'same word, then the song title' },
  { key: 'scene.autoScrollStop', readsTheSameBecause: '"Stop" is the word on French pedals too' },
  { key: 'scene.capo', readsTheSameBecause: 'guitar jargon, used as-is in French' },
  { key: 'sessions.date', readsTheSameBecause: 'same word, same spelling' },
  { key: 'sessions.kindConcert', readsTheSameBecause: 'same word, same spelling' },
  { key: 'sessions.noPreparedConcert', readsTheSameBecause: 'an em dash, not a word' },
  { key: 'sessions.section.sessions', readsTheSameBecause: 'same word, same spelling' },
  {
    key: 'sessions.section.setlists',
    readsTheSameBecause: 'same word, and French pluralises it the same way',
  },
  { key: 'sessions.setlist', readsTheSameBecause: '"setlist" is the word French musicians use' },
  {
    key: 'sessions.setlists',
    readsTheSameBecause: 'same word, and French pluralises it the same way',
  },
  { key: 'sessions.title', readsTheSameBecause: 'same word, same spelling' },
  { key: 'setlist.capo', readsTheSameBecause: 'guitar jargon, used as-is in French' },
  { key: 'setlist.capoValue', readsTheSameBecause: 'guitar jargon, used as-is in French' },
  {
    key: 'setlist.create.defaultName',
    readsTheSameBecause: '"Set 1" is what the band writes on the paper, in both languages',
  },
  { key: 'setlist.crumb', readsTheSameBecause: 'the band says "setlist" in both languages' },
  { key: 'setlist.notes', readsTheSameBecause: 'same word, same spelling' },
  { key: 'setlist.title', readsTheSameBecause: '"setlist" is the word French musicians use' },
  { key: 'shell.meVersion', readsTheSameBecause: 'the brand and a version number' },
  { key: 'takes.concert', readsTheSameBecause: 'same word, same spelling' },
  { key: 'tasks.linkedSession', readsTheSameBecause: '"Sessions" is the tab name in French too' },
  { key: 'tasks.notes', readsTheSameBecause: 'same word, same spelling' },
];

// @FollowsBlueprint test-i18n-parity
describe('i18n-parity.core', () => {
  it('the shipped catalogs are in parity', () => {
    const diff = diffCatalogs(en, fr);
    expect(diff).toEqual({ missingInEn: [], missingInFr: [] });
    expect(isInParity(diff)).toBe(true);
  });

  it('reports keys missing in en', () => {
    const diff = diffCatalogs({ a: 'a' }, { a: 'a', b: 'b' });
    expect(diff).toEqual({ missingInEn: ['b'], missingInFr: [] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports keys missing in fr', () => {
    const diff = diffCatalogs({ a: 'a', b: 'b' }, { a: 'a' });
    expect(diff).toEqual({ missingInEn: [], missingInFr: ['b'] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports both directions deterministically', () => {
    const diff = diffCatalogs({ a: 'a', x: 'x' }, { a: 'a', y: 'y' });
    expect(diff).toEqual({ missingInEn: ['y'], missingInFr: ['x'] });
  });
});

describe('listIdenticalValueKeys', () => {
  it('leaves the shipped catalogs with only the entries identical by design', () => {
    expect(listIdenticalValueKeys(en, fr)).toEqual(IDENTICAL_BY_DESIGN.map((entry) => entry.key));
  });

  it('states, for every exemption, why the two languages read the same', () => {
    const unexplained = IDENTICAL_BY_DESIGN.filter(
      (entry) => entry.readsTheSameBecause.trim() === '',
    );
    expect(unexplained).toEqual([]);
  });

  it('reports a nested key whose French value was copied from the English one', () => {
    const english = { page: { kept: 'Capo', copied: 'Chord chart' } };
    const french = { page: { kept: 'Capo', copied: 'Chord chart' } };
    expect(listIdenticalValueKeys(english, french)).toEqual(['page.copied', 'page.kept']);
  });

  it('ignores an English subtree the French catalog does not carry at all', () => {
    const english = { page: { copied: 'Chord chart' }, kept: 'Capo' };
    const french = { kept: 'Capo' };
    expect(listIdenticalValueKeys(english, french)).toEqual(['kept']);
  });

  it('ignores a key the French catalog translates, and one it does not carry at all', () => {
    const english = { translated: 'Chord chart', orphan: 'Save' };
    const french = { translated: "Grille d'accords" };
    expect(listIdenticalValueKeys(english, french)).toEqual([]);
  });

  it('ignores a branch the French catalog flattened into a string', () => {
    const english = { branch: { leaf: 'Chord chart' } };
    const french = { branch: "Grille d'accords" };
    expect(listIdenticalValueKeys(english, french)).toEqual([]);
  });
});
