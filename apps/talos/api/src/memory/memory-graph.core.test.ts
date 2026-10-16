import { describe, expect, it } from 'vitest';
import {
  buildNeighbourhood,
  findShortestPath,
  selectRelationsBegunBy,
  type StoredRelation,
} from './memory-graph.core';

const ALICE = 'second-brain/personnes/alice-martin';
const BRUNO = 'second-brain/personnes/bruno-petit';
const ACME = 'second-brain/organisations/acme';
const CLARA = 'second-brain/personnes/clara-roux';

function relation(
  id: string,
  fromSlug: string,
  verb: string,
  toSlug: string,
  since: string | null = null,
  until: string | null = null,
): StoredRelation {
  return { id, fromSlug, verb, toSlug, since, until, seen: null, sourceRef: null };
}

const RELATIONS = [
  relation('r1', ALICE, 'travaille_chez', ACME, '2025', '2026-06'),
  relation('r2', BRUNO, 'ami_de', ALICE, '2026-09'),
  relation('r3', CLARA, 'travaille_chez', ACME),
];
const PAGES = [
  { slug: ALICE, title: 'Alice Martin', kind: 'personne', closeness: 4 },
  { slug: ACME, title: 'Acme', kind: 'organisation', closeness: 3 },
];

describe('selectRelationsBegunBy', () => {
  it('keeps every relation without a date and only those begun by a date', () => {
    expect(selectRelationsBegunBy(RELATIONS, null)).toHaveLength(3);
    expect(selectRelationsBegunBy(RELATIONS, '2026-03-15').map((kept) => kept.id)).toEqual([
      'r1',
      'r3',
    ]);
  });
});

describe('buildNeighbourhood', () => {
  it('walks both directions to the requested depth, marking closed relations at the date', () => {
    const oneHop = buildNeighbourhood(PAGES, RELATIONS, ALICE, '2026-10-01', 1);
    expect(oneHop.nodes.map((node) => node.slug)).toEqual([ALICE, ACME, BRUNO]);
    expect(oneHop.edges.map((edge) => [edge.id, edge.isClosed])).toEqual([
      ['r1', true],
      ['r2', false],
    ]);
    expect(oneHop.nodes[0]).toEqual(PAGES[0]);
    expect(oneHop.nodes[2]).toEqual({
      slug: BRUNO,
      title: 'bruno-petit',
      kind: 'inconnu',
      closeness: null,
    });
    expect(
      buildNeighbourhood(PAGES, RELATIONS, ALICE, null, 2).nodes.map((node) => node.slug),
    ).toContain(CLARA);
  });
});

describe('buildNeighbourhood without a date', () => {
  it('closes only the relations that carry an until date', () => {
    const edges = buildNeighbourhood(PAGES, RELATIONS, ALICE, null, 1).edges;
    expect(edges.map((edge) => [edge.id, edge.isClosed])).toEqual([
      ['r1', true],
      ['r2', false],
    ]);
  });

  it('keeps a page with no relation as its own neighbourhood', () => {
    expect(buildNeighbourhood(PAGES, RELATIONS, 'second-brain/concepts/seul', null, 3)).toEqual({
      nodes: [
        { slug: 'second-brain/concepts/seul', title: 'seul', kind: 'inconnu', closeness: null },
      ],
      edges: [],
    });
  });
});

describe('findShortestPath', () => {
  it('finds the shortest path through relations in either direction', () => {
    expect(findShortestPath(RELATIONS, BRUNO, CLARA, null)).toEqual([
      { slug: BRUNO, via: null },
      { slug: ALICE, via: { verb: 'ami_de', direction: 'out' } },
      { slug: ACME, via: { verb: 'travaille_chez', direction: 'out' } },
      { slug: CLARA, via: { verb: 'travaille_chez', direction: 'in' } },
    ]);
  });

  it('answers null when no path exists at that date, and the start alone for itself', () => {
    expect(findShortestPath(RELATIONS, BRUNO, CLARA, '2026-03-15')).toBeNull();
    expect(findShortestPath(RELATIONS, ALICE, ALICE, null)).toEqual([{ slug: ALICE, via: null }]);
  });
});
