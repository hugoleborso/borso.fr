import { describe, expect, it } from 'vitest';
import en from './en.json';
import fr from './fr.json';
import { diffCatalogs, isInParity, listIdenticalValueKeys } from './i18n-parity.core';

/**
 * An English string sitting untouched in `fr.json` is a missed translation, not
 * a design choice. The only exceptions are the entries below, which read the
 * same in both languages. Adding a key here is a claim a reviewer can check
 * against the comment next to it.
 */
const KEYS_IDENTICAL_IN_BOTH_LANGUAGES: readonly string[] = [
  'appName', // the Pragma brand
  'bars.contactEmail', // "Email" is the label French users read too
  'bars.contactName', // same word, same spelling
  'bars.notes', // same word, same spelling
  'bars.title', // "un bar" is the same word in French
  'bars.viewKanban', // Kanban, a proper noun
  'catalog.album', // same word, same spelling
  'catalog.chartImage', // same word, same spelling
  'catalog.chartPdf', // the PDF format name
  'catalog.energyBadge', // "E" — the initial of Energy and of Énergie alike
  'catalog.linkPlaceholder', // a URL placeholder, not prose
  'catalog.masteryBadge', // "M" — the initial of Mastery and of Maîtrise alike
  'catalog.noMastery', // an em dash, not a word
  'catalog.notesGimmicks', // "gimmick" is the word French musicians use here
  'catalog.notesStructure', // same word, same spelling
  'catalog.notesTitle', // same word, same spelling
  'catalog.tags', // "tags" is the word French musicians use here
  'common.actions', // same word, same spelling
  'instruments.title', // same word, same spelling
  'lineup.edit', // fr.json says "lineup" throughout, e.g. "Lineup par défaut"
  'lineup.instruments', // same word, same spelling
  'nav.administrationSection', // same word, same spelling
  'nav.bars', // "un bar" is the same word in French
  'nav.instruments', // same word, same spelling
  'nav.language.en', // the EN language tag
  'nav.language.fr', // the FR language tag
  'nav.sessions', // same word, same spelling
  'nav.setlists', // "setlist" is the word French musicians use
  'sessions.date', // same word, same spelling
  'sessions.kindConcert', // same word, same spelling
  'sessions.noPreparedConcert', // an em dash, not a word
  'sessions.setlist', // "setlist" is the word French musicians use
  'sessions.title', // same word, same spelling
  'setlist.capo', // guitar jargon, used as-is in French
  'setlist.crumb', // the band says "setlist" in both languages
  'setlist.notes', // same word, same spelling
  'setlist.title', // "setlist" is the word French musicians use
  'shell.meName', // a first name
  'shell.meVersion', // the brand and a version number
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
  it('leaves the shipped catalogs with only the deliberately identical entries', () => {
    expect(listIdenticalValueKeys(en, fr)).toEqual(KEYS_IDENTICAL_IN_BOTH_LANGUAGES);
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
