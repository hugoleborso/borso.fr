import { describe, expect, it } from 'vitest';
import {
  composeComputedSections,
  type ContainedFact,
  type ContainmentRelation,
  dropComputedLines,
  selectContainedSlugs,
  selectDescendantSlugs,
  selectRecentWindowStart,
  selectSummaryDay,
} from './computed-sections.core';

const GARDEN = 'second-brain/domaines/jardin';
const VEGETABLES = 'second-brain/projets/potager';
const GREENHOUSE = 'second-brain/projets/serre';
const COMPOST = 'second-brain/projets/compost';
const STATUS_KEY = 'statut';
const DUE_KEY = 'echeance';
const UPDATED_AT = new Date('2026-10-31T23:30:00Z');

function contains(toSlug: string, overrides: Partial<ContainmentRelation> = {}) {
  return { verb: 'comprend', toSlug, until: null, position: 0, ...overrides };
}

function fact(entitySlug: string, overrides: Partial<ContainedFact>): ContainedFact {
  return {
    entitySlug,
    learnedOn: '2026-11-02',
    section: 'facts',
    key: null,
    value: 'fait',
    since: null,
    until: null,
    seen: null,
    sourceRef: null,
    inferred: false,
    extra: null,
    raw: null,
    position: 0,
    ...overrides,
  };
}

function project(slug: string, attributes: Record<string, string | readonly string[]>) {
  return { slug, kind: 'projet', attributes };
}

function sections(overrides: Partial<Parameters<typeof composeComputedSections>[0]>) {
  return composeComputedSections({
    containedSlugs: [],
    containedEntities: [],
    descendantFacts: [],
    windowStart: '2026-10-20',
    ...overrides,
  });
}

describe('selectContainedSlugs', () => {
  it('keeps the open comprend relations, in position order, each page once', () => {
    expect(
      selectContainedSlugs([
        contains(GREENHOUSE, { position: 2 }),
        contains(VEGETABLES, { position: 1 }),
        contains(VEGETABLES, { position: 3 }),
      ]),
    ).toStrictEqual([VEGETABLES, GREENHOUSE]);
  });

  it('leaves out a closed relation and any other verb', () => {
    expect(
      selectContainedSlugs([
        contains(GREENHOUSE, { until: '2026-09' }),
        contains(COMPOST, { verb: 'membre_de' }),
      ]),
    ).toStrictEqual([]);
  });
});

describe('selectDescendantSlugs', () => {
  it('goes two levels down, without the page itself and without a closed branch', () => {
    expect(
      selectDescendantSlugs(
        GARDEN,
        [VEGETABLES, GREENHOUSE],
        [
          contains(COMPOST),
          contains(GARDEN, { position: 1 }),
          contains(VEGETABLES, { position: 2 }),
          contains('second-brain/projets/verger', { until: '2026-09' }),
        ],
      ),
    ).toStrictEqual([VEGETABLES, GREENHOUSE, COMPOST]);
  });
});

describe('selectSummaryDay', () => {
  it('reads resume_le first', () => {
    expect(selectSummaryDay({ resume_le: '2026-10-20', maj: '2026-10-01' }, UPDATED_AT)).toBe(
      '2026-10-20',
    );
  });

  it('falls back to maj when resume_le is absent or not a day', () => {
    expect(selectSummaryDay({ maj: '2026-10-01' }, UPDATED_AT)).toBe('2026-10-01');
    expect(selectSummaryDay({ resume_le: '2026-10', maj: '2026-10-01' }, UPDATED_AT)).toBe(
      '2026-10-01',
    );
    expect(selectSummaryDay({ resume_le: ['2026-10-20'], maj: '2026-10-01' }, UPDATED_AT)).toBe(
      '2026-10-01',
    );
    expect(selectSummaryDay({ resume_le: 'le 2026-10-20', maj: '2026-10-01' }, UPDATED_AT)).toBe(
      '2026-10-01',
    );
    expect(selectSummaryDay({ resume_le: '2026-10-20 env.', maj: '2026-10-01' }, UPDATED_AT)).toBe(
      '2026-10-01',
    );
  });

  it('falls back to the Paris day of the last update when neither attribute is a day', () => {
    expect(selectSummaryDay({ maj: 'hier' }, UPDATED_AT)).toBe('2026-11-01');
    expect(selectSummaryDay({}, UPDATED_AT)).toBe('2026-11-01');
  });

  it('answers no day when nothing gives one', () => {
    expect(selectSummaryDay({}, null)).toBeNull();
  });
});

describe('selectRecentWindowStart', () => {
  it('starts at the day of the summary, else thirty days before today', () => {
    expect(selectRecentWindowStart('2026-10-20', '2026-11-11')).toBe('2026-10-20');
    expect(selectRecentWindowStart(null, '2026-11-11')).toBe('2026-10-12');
  });
});

describe('composeComputedSections', () => {
  it('names the two sections in their order, empty when nothing is contained', () => {
    expect(sections({})).toStrictEqual([
      { heading: 'Comprend', lines: [] },
      { heading: 'Faits récents', lines: [] },
    ]);
  });

  it('links each contained page, a project with its attributes that are present, in a fixed order', () => {
    const [contained] = sections({
      containedSlugs: [VEGETABLES, GREENHOUSE, COMPOST, GARDEN, 'second-brain/projets/disparu'],
      containedEntities: [
        project(VEGETABLES, {
          [DUE_KEY]: '2026-11-30',
          prochaine_etape: 'Semer les fèves',
          meteo: 'vert',
          [STATUS_KEY]: 'actif',
          type: 'projet',
        }),
        project(GREENHOUSE, { [STATUS_KEY]: 'en-pause', meteo: '', [DUE_KEY]: ['2026-12-01'] }),
        project(COMPOST, {}),
        { slug: GARDEN, kind: 'domaine', attributes: { [STATUS_KEY]: 'actif' } },
      ],
    });
    expect(contained?.lines).toStrictEqual([
      `[[${VEGETABLES}]] | statut: actif | meteo: vert | prochaine_etape: Semer les fèves | echeance: 2026-11-30`,
      `[[${GREENHOUSE}]] | statut: en-pause`,
      `[[${COMPOST}]]`,
      `[[${GARDEN}]]`,
      '[[second-brain/projets/disparu]]',
    ]);
  });

  it('lists the facts learned on or after the window start, the most recent first, as « Faits » renders them', () => {
    const [, recent] = sections({
      descendantFacts: [
        fact(VEGETABLES, { learnedOn: '2026-10-19', value: 'avant' }),
        fact(VEGETABLES, { learnedOn: '2026-10-20', key: 'planches', value: '6', since: '2026' }),
        fact(VEGETABLES, { learnedOn: null, value: 'sans date' }),
        fact(COMPOST, { learnedOn: '2026-11-05', raw: 'bac: plein | src: journal/2026-11-05' }),
        fact(GREENHOUSE, { learnedOn: '2026-10-20', section: 'history', value: 'vitre cassée' }),
      ],
    });
    expect(recent?.lines).toStrictEqual([
      `2026-11-05 | [[${COMPOST}]] | bac: plein | src: journal/2026-11-05`,
      `2026-10-20 | [[${VEGETABLES}]] | planches: 6 | depuis: 2026`,
      `2026-10-20 | [[${GREENHOUSE}]] | vitre cassée`,
    ]);
  });

  it('keeps ten facts at most, the most recent', () => {
    const days = Array.from({ length: 12 }, (_unused, index) => `2026-11-${String(index + 10)}`);
    const [, recent] = sections({
      descendantFacts: days.map((learnedOn) => fact(VEGETABLES, { learnedOn, value: learnedOn })),
    });
    expect(recent?.lines).toHaveLength(10);
    expect(recent?.lines[0]).toBe(`2026-11-21 | [[${VEGETABLES}]] | 2026-11-21`);
    expect(recent?.lines[9]).toBe(`2026-11-12 | [[${VEGETABLES}]] | 2026-11-12`);
  });
});

describe('dropComputedLines', () => {
  it('drops the lines under the two computed headings and keeps the headings in place', () => {
    expect(
      dropComputedLines(
        [
          '# Jardin',
          '',
          '- une note',
          '## Comprend',
          '',
          `- [[${VEGETABLES}]] | statut: actif`,
          `- [[${GREENHOUSE}]]`,
          '',
          '## Faits récents  ',
          `- 2026-11-05 | [[${COMPOST}]] | bac: plein`,
          'Une phrase écrite à la main.',
          '## Chronologie',
          '- 2026-10-20 : résumé réécrit.',
          '# Annexe',
          '- gardée',
          '',
        ].join('\n'),
      ),
    ).toBe(
      [
        '# Jardin',
        '',
        '- une note',
        '## Comprend',
        '',
        '',
        '## Faits récents  ',
        'Une phrase écrite à la main.',
        '## Chronologie',
        '- 2026-10-20 : résumé réécrit.',
        '# Annexe',
        '- gardée',
        '',
      ].join('\n'),
    );
  });

  it('stops dropping at a first-level heading', () => {
    expect(dropComputedLines('## Comprend\n- a\n# Annexe\n- gardée')).toBe(
      '## Comprend\n# Annexe\n- gardée',
    );
  });

  it('leaves a body without a computed heading as written', () => {
    const body = '# Alice\n\n## Faits\n\n- ville: Lyon\n## Comprendre\n- a\n### Comprend\n- b\n';
    expect(dropComputedLines(body)).toBe(body);
    expect(dropComputedLines('')).toBe('');
    expect(dropComputedLines('- une note\n## Chronologie\n- gardée')).toBe(
      '- une note\n## Chronologie\n- gardée',
    );
  });
});
