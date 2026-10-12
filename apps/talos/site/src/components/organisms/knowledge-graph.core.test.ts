import { describe, expect, it } from 'vitest';
import {
  buildMonthlyTimeline,
  findNodeTitle,
  countNodeTypes,
  hideNodeTypes,
  isLatestTimelineIndex,
  toggleHiddenType,
  selectNeighbourhood,
  selectNodeColorToken,
  selectNodeColorVariable,
  selectNodeTypeLabelKey,
  selectNodeClickIntent,
  selectTimelineDate,
  shouldDrawLabels,
} from './knowledge-graph.core';

const NODES = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
  id,
  title: id.toUpperCase(),
  type: 'projet',
}));
const CHAIN = {
  nodes: NODES,
  edges: [
    { source: 'a', target: 'b', relation: 'comprend' },
    { source: 'c', target: 'b', relation: 'comprend' },
    { source: 'c', target: 'd', relation: 'comprend' },
    { source: 'd', target: 'e', relation: 'comprend' },
  ],
};

describe('selectNeighbourhood', () => {
  it('answers the whole graph when nothing is focused', () => {
    expect(selectNeighbourhood(CHAIN, null, 2)).toBe(CHAIN);
  });

  it('keeps the nodes within two hops in either direction, and the edges between them', () => {
    const neighbourhood = selectNeighbourhood(CHAIN, 'b', 2);
    expect(neighbourhood.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(neighbourhood.edges.map((edge) => `${edge.source}-${edge.target}`)).toEqual([
      'a-b',
      'c-b',
      'c-d',
    ]);
  });

  it('stops after one hop when asked to', () => {
    expect(selectNeighbourhood(CHAIN, 'c', 1).nodes.map((node) => node.id)).toEqual([
      'b',
      'c',
      'd',
    ]);
  });

  it('keeps only the focused node at zero hops', () => {
    expect(selectNeighbourhood(CHAIN, 'c', 0).nodes.map((node) => node.id)).toEqual(['c']);
  });

  it('does not walk back through a node it already reached', () => {
    const triangle = {
      nodes: NODES.slice(0, 3),
      edges: [
        { source: 'a', target: 'b', relation: 'r' },
        { source: 'b', target: 'c', relation: 'r' },
        { source: 'c', target: 'a', relation: 'r' },
      ],
    };
    expect(selectNeighbourhood(triangle, 'a', 2).nodes).toHaveLength(3);
  });
});

describe('the node presentation', () => {
  it('colours every known type with its token and falls back for an unknown one', () => {
    expect(selectNodeColorToken('moi')).toBe('node-person');
    expect(selectNodeColorToken('personne')).toBe('node-person');
    expect(selectNodeColorToken('organisation')).toBe('node-organization');
    expect(selectNodeColorToken('projet')).toBe('node-project');
    expect(selectNodeColorToken('domaine')).toBe('node-domain');
    expect(selectNodeColorToken('concept')).toBe('node-concept');
    expect(selectNodeColorToken('engagement')).toBe('node-commitment');
    expect(selectNodeColorToken('objectifs')).toBe('node-objective');
    expect(selectNodeColorToken('reunion')).toBe('node-meeting');
    expect(selectNodeColorToken('carte')).toBe('ink-faint');
    expect(selectNodeColorVariable('projet')).toBe('--color-node-project');
  });

  it('names every known type and falls back for an unknown one', () => {
    expect(selectNodeTypeLabelKey('moi')).toBe('graph.type.moi');
    expect(selectNodeTypeLabelKey('personne')).toBe('graph.type.person');
    expect(selectNodeTypeLabelKey('organisation')).toBe('graph.type.organisation');
    expect(selectNodeTypeLabelKey('projet')).toBe('graph.type.project');
    expect(selectNodeTypeLabelKey('domaine')).toBe('graph.type.domain');
    expect(selectNodeTypeLabelKey('concept')).toBe('graph.type.concept');
    expect(selectNodeTypeLabelKey('engagement')).toBe('graph.type.commitment');
    expect(selectNodeTypeLabelKey('objectifs')).toBe('graph.type.objectives');
    expect(selectNodeTypeLabelKey('carte')).toBe('graph.type.map');
    expect(selectNodeTypeLabelKey('reunion')).toBe('graph.type.meeting');
    expect(selectNodeTypeLabelKey('autre')).toBe('graph.type.other');
  });

  it('counts each type, the most frequent first then by name', () => {
    expect(
      countNodeTypes([
        { id: '1', title: '', type: 'projet' },
        { id: '2', title: '', type: 'concept' },
        { id: '3', title: '', type: 'projet' },
        { id: '4', title: '', type: 'carte' },
      ]),
    ).toEqual([
      { type: 'projet', count: 2 },
      { type: 'carte', count: 1 },
      { type: 'concept', count: 1 },
    ]);
  });

  it('finds the title of the focused node', () => {
    expect(findNodeTitle(NODES, 'c')).toBe('C');
    expect(findNodeTitle(NODES, 'z')).toBeNull();
    expect(findNodeTitle(NODES, null)).toBeNull();
  });
});

describe('buildMonthlyTimeline', () => {
  it('runs from the end of January 2017 to today, one month at a time', () => {
    const timeline = buildMonthlyTimeline('2026-10-05');
    expect(timeline[0]).toBe('2017-01-31');
    expect(timeline[1]).toBe('2017-02-28');
    expect(timeline[11]).toBe('2017-12-31');
    expect(timeline[12]).toBe('2018-01-31');
    expect(timeline.at(-2)).toBe('2026-09-30');
    expect(timeline.at(-1)).toBe('2026-10-05');
    expect(timeline).toHaveLength(118);
  });

  it('knows a leap February', () => {
    expect(buildMonthlyTimeline('2026-10-05')).toContain('2024-02-29');
  });

  it('holds only today in the first month', () => {
    expect(buildMonthlyTimeline('2017-01-20')).toEqual(['2017-01-20']);
  });
});

describe('selectTimelineDate', () => {
  const timeline = ['2017-01-31', '2017-02-28', '2017-03-10'];

  it('answers the month end for a past position', () => {
    expect(selectTimelineDate(timeline, 1)).toBe('2017-02-28');
  });

  it('answers today at the latest position and beyond', () => {
    expect(selectTimelineDate(timeline, 2)).toBe('2017-03-10');
    expect(selectTimelineDate(timeline, 7)).toBe('2017-03-10');
  });

  it('answers the first month for a position before the start', () => {
    expect(selectTimelineDate(timeline, -1)).toBe('2017-01-31');
    expect(selectTimelineDate(timeline, 0)).toBe('2017-01-31');
  });
});

describe('shouldDrawLabels', () => {
  it('labels a small graph at any zoom', () => {
    expect(shouldDrawLabels(40, 0.5)).toBe(true);
    expect(shouldDrawLabels(41, 0.5)).toBe(false);
  });

  it('labels a large graph once zoomed in', () => {
    expect(shouldDrawLabels(300, 2)).toBe(true);
    expect(shouldDrawLabels(300, 1.9)).toBe(false);
  });
});

describe('selectNodeClickIntent', () => {
  it('focuses a node on the first click and opens it on the second', () => {
    expect(selectNodeClickIntent(null, 'a')).toBe('focus');
    expect(selectNodeClickIntent('b', 'a')).toBe('focus');
    expect(selectNodeClickIntent('a', 'a')).toBe('open');
  });
});

describe('hideNodeTypes', () => {
  it('removes the hidden types and the edges that touched them', () => {
    const graph = {
      nodes: [
        { id: 'a', title: 'A', type: 'personne' },
        { id: 'b', title: 'B', type: 'projet' },
        { id: 'c', title: 'C', type: 'personne' },
      ],
      edges: [
        { source: 'a', target: 'b', relation: 'r' },
        { source: 'a', target: 'c', relation: 'r' },
        { source: 'b', target: 'c', relation: 'r' },
      ],
    };
    const shown = hideNodeTypes(graph, new Set(['projet']));
    expect(shown.nodes.map((node) => node.id)).toEqual(['a', 'c']);
    expect(shown.edges).toEqual([{ source: 'a', target: 'c', relation: 'r' }]);
  });
});

describe('toggleHiddenType', () => {
  it('hides a shown type and shows a hidden one without touching the given set', () => {
    const hidden = new Set(['projet']);
    expect([...toggleHiddenType(hidden, 'concept')]).toEqual(['projet', 'concept']);
    expect([...toggleHiddenType(hidden, 'projet')]).toEqual([]);
    expect([...hidden]).toEqual(['projet']);
  });
});

describe('isLatestTimelineIndex', () => {
  it('recognises the last position as today', () => {
    expect(isLatestTimelineIndex(['a', 'b'], 1)).toBe(true);
    expect(isLatestTimelineIndex(['a', 'b'], 0)).toBe(false);
  });
});
