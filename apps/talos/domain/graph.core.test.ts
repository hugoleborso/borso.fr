import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  computeLowerBound,
  computeUpperBound,
  hasRelationStartedBy,
  isRelationClosedOn,
  isRelationTrueOn,
  type GraphRelation,
} from './graph.core';

const RELATIONS: GraphRelation[] = [
  {
    source: 'second-brain/moi',
    relation: 'travaille_sur',
    target: 'second-brain/projets/audit-initech',
    since: '2026-01',
    until: '2026-05',
    seen: '2026-05-30',
  },
  {
    source: 'second-brain/moi',
    relation: 'travaille_sur',
    target: 'second-brain/projets/refonte-du-site-globex',
    since: '2026-09-01',
    until: '',
    seen: '2026-10-02',
  },
  {
    source: 'second-brain/projets/refonte-du-site-globex',
    relation: 'client',
    target: 'second-brain/organisations/globex',
    since: '~2026-07',
    until: '',
    seen: '',
  },
];

function neighboursOfOwner(date: string): string[] {
  return RELATIONS.filter(
    (relation) => relation.source === 'second-brain/moi' && isRelationTrueOn(relation, date),
  ).map((relation) => relation.target);
}

describe('computeLowerBound and computeUpperBound, as scripts/graphe.py computes them', () => {
  it.each([
    ['2026', '2026-01-01', '2026-12-31'],
    ['2026-09', '2026-09-01', '2026-09-31'],
    ['~2026-07', '2026-07-01', '2026-07-31'],
    ['~~2025', '2025-01-01', '2025-12-31'],
    ['2026-10-02', '2026-10-02', '2026-10-02'],
    ['2026-09 (inféré)', '2026-09 (inféré)', '2026-09 (inféré)'],
  ])('bounds %s between %s and %s', (date, lower, upper) => {
    expect(computeLowerBound(date)).toBe(lower);
    expect(computeUpperBound(date)).toBe(upper);
  });
});

describe('isRelationTrueOn, ported from scripts/test_graphe.py', () => {
  it('keeps only the relations true on a past date', () => {
    expect(neighboursOfOwner('2026-03-15')).toEqual(['second-brain/projets/audit-initech']);
  });

  it('lets a partial end date cover the whole month', () => {
    expect(neighboursOfOwner('2026-05-31')).toEqual(['second-brain/projets/audit-initech']);
  });

  it('drops a relation the day after its end', () => {
    expect(neighboursOfOwner('2026-06-01')).toEqual([]);
  });

  it('keeps a relation from its first day', () => {
    expect(neighboursOfOwner('2026-09-01')).toEqual([
      'second-brain/projets/refonte-du-site-globex',
    ]);
  });

  it('drops a relation the day before its start', () => {
    expect(neighboursOfOwner('2025-12-31')).toEqual([]);
  });

  it('treats an approximate start as the start of its month', () => {
    const client = RELATIONS[2]!;
    expect(isRelationTrueOn(client, '2026-07-01')).toBe(true);
    expect(isRelationTrueOn(client, '2026-06-30')).toBe(false);
  });
});

describe('buildGraph', () => {
  const pages = [
    { id: 'second-brain/moi', title: 'Alex', type: 'moi' },
    { id: 'second-brain/projets/refonte-du-site-globex', title: 'Refonte', type: 'projet' },
  ];

  it('keeps every relation and adds a node for each endpoint without a page', () => {
    expect(buildGraph(pages, RELATIONS, null)).toEqual({
      nodes: [
        ...pages,
        { id: 'second-brain/projets/audit-initech', title: 'audit-initech', type: 'inconnu' },
        { id: 'second-brain/organisations/globex', title: 'globex', type: 'inconnu' },
      ],
      edges: [
        {
          source: 'second-brain/moi',
          target: 'second-brain/projets/audit-initech',
          relation: 'travaille_sur',
          since: '2026-01',
          until: '2026-05',
          seen: '2026-05-30',
          isClosed: true,
        },
        {
          source: 'second-brain/moi',
          target: 'second-brain/projets/refonte-du-site-globex',
          relation: 'travaille_sur',
          since: '2026-09-01',
          seen: '2026-10-02',
          isClosed: false,
        },
        {
          source: 'second-brain/projets/refonte-du-site-globex',
          target: 'second-brain/organisations/globex',
          relation: 'client',
          since: '~2026-07',
          isClosed: false,
        },
      ],
    });
  });

  it('keeps only the edges begun by the asked date', () => {
    const graph = buildGraph(pages, RELATIONS, '2026-03-15');
    expect(graph.edges.map((edge) => edge.target)).toEqual(['second-brain/projets/audit-initech']);
    expect(graph.nodes.map((node) => node.id)).toEqual([
      'second-brain/moi',
      'second-brain/projets/refonte-du-site-globex',
      'second-brain/projets/audit-initech',
    ]);
  });

  it('keeps a relation ended before the asked date, marked closed', () => {
    const graph = buildGraph(pages, RELATIONS, '2026-10-08');
    expect(graph.edges.map((edge) => [edge.target, edge.isClosed])).toEqual([
      ['second-brain/projets/audit-initech', true],
      ['second-brain/projets/refonte-du-site-globex', false],
      ['second-brain/organisations/globex', false],
    ]);
  });

  it('writes an edge without dates when the relation has none', () => {
    const undated = {
      source: 'a',
      relation: 'ami_de',
      target: 'b',
      since: '',
      until: '',
      seen: '',
    };
    expect(buildGraph([], [undated], null).edges).toEqual([
      { source: 'a', target: 'b', relation: 'ami_de', isClosed: false },
    ]);
  });
});

describe('hasRelationStartedBy', () => {
  const relation = RELATIONS[0]!;

  it('counts the first day of a partial start as begun', () => {
    expect(hasRelationStartedBy(relation, '2026-01-01')).toBe(true);
    expect(hasRelationStartedBy(relation, '2025-12-31')).toBe(false);
  });
});

describe('isRelationClosedOn', () => {
  const ended = RELATIONS[0]!;
  const ongoing = RELATIONS[1]!;

  it('closes a relation the day after the end of its partial end date', () => {
    expect(isRelationClosedOn(ended, '2026-05-31')).toBe(false);
    expect(isRelationClosedOn(ended, '2026-06-01')).toBe(true);
  });

  it('closes any ended relation when no date is asked', () => {
    expect(isRelationClosedOn(ended, null)).toBe(true);
  });

  it('never closes a relation without an end', () => {
    expect(isRelationClosedOn(ongoing, null)).toBe(false);
    expect(isRelationClosedOn(ongoing, '2030-01-01')).toBe(false);
  });
});
