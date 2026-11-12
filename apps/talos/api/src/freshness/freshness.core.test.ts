import { describe, expect, it } from 'vitest';
import { parseFreshness } from './freshness.core';

const TITLE_FIELD = 'titre';
const GENERATED_AT = '2026-11-11T20:10:00+01:00';

const GREENHOUSE = {
  slug: 'second-brain/projets/serre',
  [TITLE_FIELD]: 'Serre',
  type: 'projet',
  proximite: 2,
  resume_le: '2026-09-12',
  faits: 4,
  faits_englobes: 20,
  retard: 48,
};

function freshnessFile(pages: readonly unknown[], overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ genere: GENERATED_AT, en_retard: 7, pages, ...overrides });
}

describe('parseFreshness', () => {
  it('reads the French keys of the state into the English shape', () => {
    expect(parseFreshness(freshnessFile([GREENHOUSE]))).toStrictEqual({
      generatedAt: GENERATED_AT,
      lateCount: 7,
      pages: [
        {
          slug: 'second-brain/projets/serre',
          title: 'Serre',
          kind: 'projet',
          closeness: 2,
          summarizedOn: '2026-09-12',
          factCount: 4,
          containedFactCount: 20,
          lateness: 48,
        },
      ],
    });
  });

  it('keeps a page without a closeness, the key null or absent', () => {
    const { proximite: _closeness, ...withoutCloseness } = GREENHOUSE;
    const freshness = parseFreshness(
      freshnessFile([{ ...GREENHOUSE, proximite: null }, withoutCloseness]),
    );
    expect(freshness.pages.map((page) => page.closeness)).toStrictEqual([null, null]);
  });

  it('drops a page that does not parse and keeps the others', () => {
    const freshness = parseFreshness(
      freshnessFile([
        { ...GREENHOUSE, slug: '' },
        { ...GREENHOUSE, [TITLE_FIELD]: '' },
        { ...GREENHOUSE, type: 4 },
        { ...GREENHOUSE, proximite: 'forte' },
        { ...GREENHOUSE, resume_le: 'en septembre' },
        { ...GREENHOUSE, faits: '4' },
        { ...GREENHOUSE, faits_englobes: null },
        { ...GREENHOUSE, retard: 'beaucoup' },
        'serre',
        { ...GREENHOUSE, slug: 'second-brain/projets/potager' },
      ]),
    );
    expect(freshness.pages.map((page) => page.slug)).toStrictEqual([
      'second-brain/projets/potager',
    ]);
    expect(freshness.lateCount).toBe(7);
  });

  it('answers no date when the state does not say when it was written', () => {
    expect(parseFreshness(JSON.stringify({ en_retard: 1, pages: [GREENHOUSE] }))).toMatchObject({
      generatedAt: null,
      lateCount: 1,
      pages: [{ slug: 'second-brain/projets/serre' }],
    });
  });

  it('answers nothing late when the state is missing or unreadable', () => {
    const empty = { generatedAt: null, lateCount: 0, pages: [] };
    expect(parseFreshness(null)).toStrictEqual(empty);
    expect(parseFreshness('{')).toStrictEqual(empty);
    expect(parseFreshness(JSON.stringify({ genere: GENERATED_AT, en_retard: 7 }))).toStrictEqual(
      empty,
    );
    expect(parseFreshness(freshnessFile([GREENHOUSE], { genere: 12 }))).toStrictEqual(empty);
    expect(parseFreshness(freshnessFile([GREENHOUSE], { en_retard: -1 }))).toStrictEqual(empty);
    expect(parseFreshness(freshnessFile([GREENHOUSE], { en_retard: 1.5 }))).toStrictEqual(empty);
    expect(parseFreshness(JSON.stringify({ genere: GENERATED_AT, pages: [] }))).toStrictEqual(
      empty,
    );
  });
});
