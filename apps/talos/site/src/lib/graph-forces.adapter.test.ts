import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  arrangeAroundOwner,
  buildRadialForce,
  forgetPositions,
  type GraphLink,
  type GraphNode,
  type LayoutHost,
  relayout,
  releaseHeldNodes,
  rememberPositions,
} from './graph-forces.adapter';

const TODAY = '2026-10-08';

function buildNode(id: string, extra: Partial<GraphNode> = {}): GraphNode {
  return { id, title: id, colorVariable: '--color-node-person', targetRadius: 100, ...extra };
}

function buildLayoutHost(currentNodes: GraphNode[]) {
  const received: { nodes: GraphNode[]; links: GraphLink[] }[] = [];
  const settings: Record<string, number> = {};
  const host: LayoutHost = {
    graphData: (data?: { nodes: GraphNode[]; links: GraphLink[] }) => {
      if (data !== undefined) received.push(data);
      return { nodes: currentNodes };
    },
    d3AlphaDecay: (value) => (settings.alphaDecay = value),
    warmupTicks: (value) => (settings.warmupTicks = value),
    cooldownTicks: (value) => (settings.cooldownTicks = value),
  };
  return { host, received, settings };
}

const GRAPH = {
  nodes: [
    { id: 'moi', title: 'Alex', type: 'moi' },
    { id: 'lea', title: 'Léa', type: 'personne', proximity: 5 },
  ],
  edges: [{ source: 'moi', target: 'lea', relation: 'frere_soeur_de', isClosed: false }],
};

beforeEach(() => {
  forgetPositions();
});

describe('buildRadialForce', () => {
  it('nudges every initialised node towards its circle, starting from rest', () => {
    const force = buildRadialForce();
    const inside = buildNode('inside', { x: 30, y: 40 });
    const moving = buildNode('moving', { x: 0, y: 200, vx: 1, vy: 2 });
    force.initialize([inside, moving]);
    force(1);
    expect(inside.vx).toBeCloseTo(9, 5);
    expect(inside.vy).toBeCloseTo(12, 5);
    expect(moving.vx).toBeCloseTo(1, 5);
    expect(moving.vy).toBeCloseTo(2 - 30, 5);
  });

  it('treats a node without coordinates as sitting at the centre', () => {
    const force = buildRadialForce();
    const unplaced = buildNode('unplaced');
    force.initialize([unplaced]);
    force(1);
    expect(unplaced).toMatchObject({ vx: 0, vy: 0 });
  });

  it('does nothing before it is initialised', () => {
    expect(() => buildRadialForce()(1)).not.toThrow();
  });
});

describe('arrangeAroundOwner', () => {
  it('sizes the links, strengthens the charge, drops the centring and adds the radial pull', () => {
    const distance = vi.fn();
    const strength = vi.fn();
    const chargeStrength = vi.fn();
    const forces: Record<string, unknown> = {
      link: Object.assign(() => undefined, { distance, strength }),
      charge: Object.assign(() => undefined, { strength: chargeStrength }),
    };
    const assigned: [string, unknown][] = [];
    arrangeAroundOwner({
      d3Force: (name: string, force?: unknown) => {
        if (force !== undefined) assigned.push([name, force]);
        return forces[name];
      },
    });
    const link = { source: 'a', target: 'b', distance: 60, strength: 0.8, isClosed: false };
    expect(distance.mock.calls[0]?.[0](link)).toBe(60);
    expect(strength.mock.calls[0]?.[0](link)).toBe(0.8);
    expect(chargeStrength).toHaveBeenCalledWith(-70);
    expect(assigned.map(([name]) => name)).toEqual(['center', 'radial']);
    expect(assigned[0]?.[1]).toBeNull();
    expect(assigned[1]?.[1]).toBeTypeOf('function');
  });

  it('leaves a force it cannot configure alone', () => {
    const assigned: string[] = [];
    expect(() =>
      arrangeAroundOwner({
        d3Force: (name: string, force?: unknown) => {
          if (force !== undefined) assigned.push(name);
          return undefined;
        },
      }),
    ).not.toThrow();
    expect(assigned).toEqual(['center', 'radial']);
  });
});

describe('releaseHeldNodes', () => {
  it('unpins only the nodes held for the off-screen settling', () => {
    const held = buildNode('held', { fx: 10, fy: 20, isHeldInPlace: true });
    const owner = buildNode('owner', { fx: 0, fy: 0, isHeldInPlace: false });
    releaseHeldNodes([held, owner]);
    expect(held).toMatchObject({ fx: undefined, fy: undefined, isHeldInPlace: false });
    expect(owner).toMatchObject({ fx: 0, fy: 0 });
  });
});

describe('relayout', () => {
  it('animates the first layout of the session and asks for an animated fit', () => {
    const { host, received, settings } = buildLayoutHost([]);
    expect(relayout(host, GRAPH, TODAY, false)).toBe(400);
    expect(settings).toEqual({ alphaDecay: 0.0228, warmupTicks: 0, cooldownTicks: 200 });
    expect(received[0]?.nodes.map((node) => node.id)).toEqual(['moi', 'lea']);
    expect(received[0]?.links).toHaveLength(1);
  });

  it('settles off screen around the positions the previous graph left, without refitting', () => {
    const { host, received, settings } = buildLayoutHost([buildNode('lea', { x: 12, y: 34 })]);
    expect(relayout(host, GRAPH, TODAY, true)).toBeNull();
    expect(settings).toEqual({ alphaDecay: 0.1, warmupTicks: 80, cooldownTicks: 0 });
    expect(received[0]?.nodes[1]).toMatchObject({
      x: 12,
      y: 34,
      fx: 12,
      fy: 34,
      isHeldInPlace: true,
    });
  });

  it('frames at once a new visit that finds positions from an earlier one', () => {
    rememberPositions([buildNode('lea', { x: 1, y: 2 })]);
    const { host } = buildLayoutHost([]);
    expect(relayout(host, GRAPH, TODAY, false)).toBe(0);
  });
});

describe('forgetPositions', () => {
  it('makes the next layout a first one again', () => {
    rememberPositions([buildNode('lea', { x: 1, y: 2 })]);
    forgetPositions();
    const { host } = buildLayoutHost([]);
    expect(relayout(host, GRAPH, TODAY, false)).toBe(400);
  });
});
