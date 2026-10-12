import { describe, expect, it } from 'vitest';
import {
  formatLineAttribute,
  normalizeAttributeKey,
  parseLineAttributes,
  readLineAttribute,
} from './line-attributes.core';

describe('readLineAttribute', () => {
  it('splits a key from its value at the first colon', () => {
    expect(readLineAttribute(' échéance: statut: ')).toEqual({
      key: 'échéance',
      value: 'statut:',
      raw: 'échéance: statut:',
    });
  });

  it('tolerates spaces around the colon', () => {
    expect(readLineAttribute('horizon :  2026-10-15')).toEqual({
      key: 'horizon',
      value: '2026-10-15',
      raw: 'horizon :  2026-10-15',
    });
  });

  it('keeps a segment without a colon as a keyless attribute', () => {
    expect(readLineAttribute(' urgent ')).toEqual({ key: null, value: 'urgent', raw: 'urgent' });
  });
});

describe('normalizeAttributeKey', () => {
  it('composes accents so that both spellings of a key compare equal', () => {
    expect(normalizeAttributeKey(' ajouté ')).toBe('ajouté');
  });
});

describe('parseLineAttributes', () => {
  it('maps each key to its first value and ignores keyless segments', () => {
    const attributes = parseLineAttributes(['horizon: 2026-10-15', 'urgent', 'horizon: plus tard']);
    expect([...attributes]).toEqual([['horizon', '2026-10-15']]);
  });
});

describe('formatLineAttribute', () => {
  it('writes a key and its value the way the files do', () => {
    expect(formatLineAttribute('fait', '2026-10-05')).toBe('fait: 2026-10-05');
  });
});
