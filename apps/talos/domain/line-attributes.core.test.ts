import { describe, expect, it } from 'vitest';
import { normalizeAttributeKey, readLineAttribute } from './line-attributes.core';

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
