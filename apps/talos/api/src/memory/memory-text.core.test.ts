import { describe, expect, it } from 'vitest';
import {
  buildContainsPattern,
  buildExcerpt,
  foldForSearch,
  hasFoldedMatch,
  isMemorySlug,
  isMissingMemoryTarget,
  measureBytes,
  normalizeAliasValue,
  readSlugTail,
} from './memory-text.core';

describe('memory text rules', () => {
  it('folds case and accents for search', () => {
    expect(foldForSearch('Élodie ÇA')).toBe('elodie ca');
  });

  it('normalises an alias by folding and collapsing whitespace', () => {
    expect(normalizeAliasValue('  Alice   MARTIN ')).toBe('alice martin');
  });

  it('builds a contains pattern with the like wildcards escaped', () => {
    expect(buildContainsPattern(' 100%_Acme\\ ')).toBe('%100\\%\\_acme\\\\%');
  });

  it('matches folded text and never a missing column', () => {
    expect(hasFoldedMatch('Réunion Acme', 'reunion')).toBe(true);
    expect(hasFoldedMatch('Réunion Acme', 'bureau')).toBe(false);
    expect(hasFoldedMatch(null, 'acme')).toBe(false);
    expect(hasFoldedMatch('Réunion Acme', ' acme ')).toBe(true);
  });

  it('cuts an excerpt of 80 characters around the first hit, with ellipses where it cuts', () => {
    const text = `${'a'.repeat(100)} Acme ${'b'.repeat(100)}`;
    const excerpt = buildExcerpt(text, 'acme');
    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt).toContain('Acme');
    expect(excerpt.length).toBe(1 + 80 + 4 + 80 + 1);
    expect(buildExcerpt('court  texte\nAcme', 'acme')).toBe('court texte Acme');
  });

  it('ignores the spaces around the query and trims the excerpt', () => {
    const text = `${'a'.repeat(100)} Acme ${'b'.repeat(100)}`;
    expect(buildExcerpt(text, '  acme  ')).toBe(buildExcerpt(text, 'acme'));
    expect(buildExcerpt(`  Acme  ${'c'.repeat(100)}`, 'acme')).toBe(`Acme ${'c'.repeat(78)}…`);
  });

  it('starts the excerpt at the beginning when the query is absent', () => {
    expect(buildExcerpt('Alice', 'zzz')).toBe('Alice');
  });

  it('recognises the slugs of the memory and nothing else', () => {
    expect(isMemorySlug('second-brain/personnes/alice-martin')).toBe(true);
    expect(isMemorySlug('engagements/2026-10-05-devis-acme')).toBe(true);
    expect(isMemorySlug('index')).toBe(true);
    expect(isMemorySlug('https://exemple.fr')).toBe(false);
    expect(isMemorySlug('Acme')).toBe(false);
  });

  it('calls a memory target missing only when no page holds it', () => {
    expect(isMissingMemoryTarget('second-brain/x', 0)).toBe(true);
    expect(isMissingMemoryTarget('second-brain/x', 1)).toBe(false);
    expect(isMissingMemoryTarget('Acme', 0)).toBe(false);
  });

  it('reads the last segment of a slug and measures utf-8 bytes', () => {
    expect(readSlugTail('second-brain/personnes/alice')).toBe('alice');
    expect(readSlugTail('index')).toBe('index');
    expect(measureBytes('é')).toBe(2);
  });
});
