import { describe, expect, it } from 'vitest';
import { collectPositions, seedPositions, selectSimulationPlan } from './graph-simulation.core';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function node(id: string, targetRadius = 100) {
  return { id, title: id, colorVariable: '--color-node-person', targetRadius };
}

function link(source: string, target: string) {
  return { source, target, distance: 70, strength: 0.5, isClosed: false };
}

describe('selectSimulationPlan', () => {
  it('animates the very first layout and fits it in view', () => {
    expect(selectSimulationPlan(true, true)).toEqual({
      warmupTicks: 0,
      cooldownTicks: 200,
      alphaDecay: 0.0228,
      fitDurationMs: 400,
    });
  });

  it('settles a later layout off screen and frames it at once on a new visit', () => {
    expect(selectSimulationPlan(false, true)).toEqual({
      warmupTicks: 80,
      cooldownTicks: 0,
      alphaDecay: 0.1,
      fitDurationMs: 0,
    });
  });

  it('settles a recomputed layout off screen and leaves the view alone', () => {
    expect(selectSimulationPlan(false, false)).toEqual({
      warmupTicks: 80,
      cooldownTicks: 0,
      alphaDecay: 0.1,
      fitDurationMs: null,
    });
  });
});

describe('seedPositions', () => {
  it('holds every node already laid out where it was, except one pinned by its own rule', () => {
    const seeded = seedPositions(
      { nodes: [{ ...node('owner', 0), fx: 0, fy: 0 }, node('a')], links: [] },
      new Map([
        ['owner', { x: 0, y: 0 }],
        ['a', { x: 10, y: -20 }],
      ]),
    );
    expect(seeded.nodes).toEqual([
      { ...node('owner', 0), x: 0, y: 0, fx: 0, fy: 0, isHeldInPlace: false },
      { ...node('a'), x: 10, y: -20, fx: 10, fy: -20, isHeldInPlace: true },
    ]);
  });

  it('lets a new node move freely', () => {
    const seeded = seedPositions({ nodes: [node('new')], links: [] }, new Map());
    expect(seeded.nodes[0]).not.toHaveProperty('fx');
    expect(seeded.nodes[0]?.isHeldInPlace).toBe(false);
  });

  it('keeps the position of every node already laid out', () => {
    const seeded = seedPositions(
      { nodes: [node('a'), node('b')], links: [link('a', 'b')] },
      new Map([
        ['a', { x: 10, y: -20 }],
        ['b', { x: 30, y: 40 }],
      ]),
    );
    expect(seeded.nodes.map(({ id, x, y }) => [id, x, y])).toEqual([
      ['a', 10, -20],
      ['b', 30, 40],
    ]);
    expect(seeded.links).toEqual([link('a', 'b')]);
  });

  it('puts a new node next to the average of its known neighbours, whichever side the link points', () => {
    const seeded = seedPositions(
      { nodes: [node('new'), node('a'), node('b')], links: [link('new', 'a'), link('b', 'new')] },
      new Map([
        ['a', { x: 100, y: 0 }],
        ['b', { x: 0, y: 100 }],
      ]),
    );
    const placed = seeded.nodes[0]!;
    expect(Math.hypot(placed.x - 50, placed.y - 50)).toBeCloseTo(18, 5);
    expect(placed.x).toBeCloseTo(68, 5);
    expect(placed.y).toBeCloseTo(50, 5);
  });

  it('ignores the links that do not touch the new node, and turns by the golden angle', () => {
    const seeded = seedPositions(
      {
        nodes: [node('a'), node('new'), node('b')],
        links: [link('b', 'a'), link('a', 'b'), link('new', 'a')],
      },
      new Map([
        ['a', { x: 100, y: 0 }],
        ['b', { x: 0, y: 100 }],
      ]),
    );
    const placed = seeded.nodes[1]!;
    expect(placed.x).toBeCloseTo(100 + 18 * Math.cos(GOLDEN_ANGLE), 5);
    expect(placed.y).toBeCloseTo(18 * Math.sin(GOLDEN_ANGLE), 5);
  });

  it('puts a new node without known neighbours on its own circle', () => {
    const seeded = seedPositions(
      { nodes: [node('a'), node('lonely', 145)], links: [link('lonely', 'ghost')] },
      new Map([['a', { x: 0, y: 0 }]]),
    );
    const placed = seeded.nodes[1]!;
    expect(Math.hypot(placed.x, placed.y)).toBeCloseTo(145, 5);
    expect(placed.x).toBeCloseTo(145 * Math.cos(GOLDEN_ANGLE), 5);
    expect(placed.y).toBeCloseTo(145 * Math.sin(GOLDEN_ANGLE), 5);
  });
});

describe('collectPositions', () => {
  it('keeps only the nodes the simulation has placed', () => {
    expect(
      collectPositions([
        { id: 'a', x: 1, y: 2 },
        { id: 'b', x: 3 },
        { id: 'c', y: 4 },
        { id: 'd' },
      ]),
    ).toEqual([['a', { x: 1, y: 2 }]]);
  });
});
