import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  computeLowerBound,
  computeUpperBound,
  isRelationTrueOn,
  parseGraphRelations,
} from './graph.core';

const GRAPH_FILE = [
  '{"source": "second-brain/moi", "relation": "travaille_sur", "cible": "second-brain/projets/audit-initech", "depuis": "2026-01", "jusqua": "2026-05", "vu": "2026-05-30", "src": "x"}',
  '{"source": "second-brain/moi", "relation": "travaille_sur", "cible": "second-brain/projets/refonte-du-site-globex", "depuis": "2026-09-01", "jusqua": "", "vu": "2026-10-02", "src": "y"}',
  '',
  '{"source": "second-brain/projets/refonte-du-site-globex", "relation": "client", "cible": "second-brain/organisations/globex", "depuis": "~2026-07"}',
  '{ pas du json',
  '{"source": "second-brain/moi", "relation": "ami_de"}',
].join('\n');

const RELATIONS = parseGraphRelations(GRAPH_FILE);

function neighboursOfOwner(date: string): string[] {
  return RELATIONS.filter(
    (relation) => relation.source === 'second-brain/moi' && isRelationTrueOn(relation, date),
  ).map((relation) => relation.target);
}

describe('parseGraphRelations', () => {
  it('reads every well-formed line and skips blank, broken and incomplete ones', () => {
    expect(RELATIONS).toEqual([
      {
        source: 'second-brain/moi',
        relation: 'travaille_sur',
        target: 'second-brain/projets/audit-initech',
        since: '2026-01',
        until: '2026-05',
      },
      {
        source: 'second-brain/moi',
        relation: 'travaille_sur',
        target: 'second-brain/projets/refonte-du-site-globex',
        since: '2026-09-01',
        until: '',
      },
      {
        source: 'second-brain/projets/refonte-du-site-globex',
        relation: 'client',
        target: 'second-brain/organisations/globex',
        since: '~2026-07',
        until: '',
      },
    ]);
  });
});

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
        },
        {
          source: 'second-brain/moi',
          target: 'second-brain/projets/refonte-du-site-globex',
          relation: 'travaille_sur',
          since: '2026-09-01',
        },
        {
          source: 'second-brain/projets/refonte-du-site-globex',
          target: 'second-brain/organisations/globex',
          relation: 'client',
          since: '~2026-07',
        },
      ],
    });
  });

  it('keeps only the edges true on the asked date', () => {
    const graph = buildGraph(pages, RELATIONS, '2026-03-15');
    expect(graph.edges.map((edge) => edge.target)).toEqual(['second-brain/projets/audit-initech']);
    expect(graph.nodes.map((node) => node.id)).toEqual([
      'second-brain/moi',
      'second-brain/projets/refonte-du-site-globex',
      'second-brain/projets/audit-initech',
    ]);
  });

  it('writes an edge without dates when the relation has none', () => {
    const undated = { source: 'a', relation: 'ami_de', target: 'b', since: '', until: '' };
    expect(buildGraph([], [undated], null).edges).toEqual([
      { source: 'a', target: 'b', relation: 'ami_de' },
    ]);
  });
});
