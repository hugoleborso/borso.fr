import { describe, expect, it } from 'vitest';
import {
  computeCentredZoom,
  computeRadialPull,
  isConfigurableChargeForce,
  isConfigurableLinkForce,
  selectLinkColorVariable,
  computeRecencyWeight,
  RECENCY_MODE,
  selectLinkDistance,
  selectLinkStrength,
  selectRelationTie,
  selectTargetRadius,
  toRenderableGraph,
} from './graph-layout.core';

const TODAY = '2026-10-08';

function buildEdge(relation: string, isClosed: boolean, seen?: string) {
  return { source: 'a', target: 'b', relation, isClosed, seen };
}

describe('selectRelationTie', () => {
  it.each([
    ['en_couple_avec', 'family'],
    ['parent_de', 'family'],
    ['frere_soeur_de', 'family'],
    ['cousin_de', 'family'],
    ['parrain_de', 'family'],
    ['ami_de', 'friendship'],
    ['colocataire_de', 'friendship'],
    ['cofondateur_potentiel', 'friendship'],
    ['travaille_chez', 'work'],
    ['travaille_sur', 'work'],
    ['responsable_de', 'work'],
    ['rend_compte_a', 'work'],
    ['client', 'work'],
    ['recrute_pour', 'work'],
    ['en_discussion_avec', 'work'],
    ['membre_de', 'work'],
    ['participe_a', 'work'],
    ['comprend', 'work'],
    ['filiale_de', 'work'],
    ['a_presente', 'work'],
    ['voisin_de', 'other'],
  ])('ranks %s as %s', (relation, tie) => {
    expect(selectRelationTie(relation)).toBe(tie);
  });
});

describe('selectTargetRadius', () => {
  it('puts the owner at the centre whatever the score', () => {
    expect(selectTargetRadius('moi', 1)).toBe(0);
    expect(selectTargetRadius('moi', undefined)).toBe(0);
  });

  it('draws a closer page on a smaller circle', () => {
    expect([5, 4, 3, 2, 1].map((score) => selectTargetRadius('personne', score))).toEqual([
      80, 130, 175, 215, 250,
    ]);
  });

  it('places a page without a valid score as a score of 2', () => {
    expect(selectTargetRadius('projet', undefined)).toBe(215);
    expect(selectTargetRadius('projet', 0)).toBe(215);
    expect(selectTargetRadius('projet', 9)).toBe(215);
  });
});

describe('selectLinkDistance', () => {
  it('keeps family shortest, friendship middle and work longest', () => {
    expect(selectLinkDistance('en_couple_avec', false)).toBe(60);
    expect(selectLinkDistance('ami_de', false)).toBe(80);
    expect(selectLinkDistance('travaille_chez', false)).toBe(130);
    expect(selectLinkDistance('voisin_de', false)).toBe(100);
  });

  it('stretches a closed relation by half again', () => {
    expect(selectLinkDistance('ami_de', true)).toBe(120);
  });
});

describe('computeRecencyWeight', () => {
  it('weighs a relation seen today fully', () => {
    expect(computeRecencyWeight(TODAY, TODAY)).toBe(1);
  });

  it('halves the weight after one half-life of 182 days', () => {
    expect(computeRecencyWeight('2026-04-09', TODAY)).toBeCloseTo(0.5, 5);
  });

  it('reads a partial date by its last day', () => {
    expect(computeRecencyWeight('2026-10', '2026-10-31')).toBe(1);
  });

  it('never weighs a relation seen after the asked date above one', () => {
    expect(computeRecencyWeight('2026-12-01', TODAY)).toBe(1);
  });

  it('keeps a floor for a very old or unknown sighting', () => {
    expect(computeRecencyWeight('2016-01-01', TODAY)).toBe(0.1);
    expect(computeRecencyWeight(undefined, TODAY)).toBe(0.1);
    expect(computeRecencyWeight('jamais', TODAY)).toBe(0.1);
  });
});

describe('selectLinkStrength', () => {
  it('pulls family hardest and work least, ignoring the age', () => {
    expect(selectLinkStrength(buildEdge('parent_de', false), TODAY, 'ignored')).toBe(0.8);
    expect(selectLinkStrength(buildEdge('ami_de', false), TODAY, 'ignored')).toBe(0.5);
    expect(selectLinkStrength(buildEdge('client', false), TODAY, 'ignored')).toBe(0.12);
    expect(selectLinkStrength(buildEdge('voisin_de', false), TODAY, 'ignored')).toBe(0.2);
  });

  it('weakens a closed relation to a quarter', () => {
    expect(selectLinkStrength(buildEdge('parent_de', true), TODAY, 'ignored')).toBe(0.2);
  });

  it('scales the pull by the recency weight under the half-life mode', () => {
    const halfLifeAgo = buildEdge('ami_de', false, '2026-04-09');
    expect(selectLinkStrength(halfLifeAgo, TODAY, 'half-life')).toBeCloseTo(0.25, 5);
    expect(selectLinkStrength(halfLifeAgo, TODAY, 'ignored')).toBe(0.5);
  });
});

describe('RECENCY_MODE', () => {
  it('ships one of the two modes', () => {
    expect(['ignored', 'half-life']).toContain(RECENCY_MODE);
  });
});

describe('toRenderableGraph', () => {
  it('pins the owner, places every page on its circle and sizes every link', () => {
    const renderable = toRenderableGraph(
      {
        nodes: [
          { id: 'moi', title: 'Alex', type: 'moi' },
          { id: 'p', title: 'Lucie', type: 'personne', proximity: 5 },
          { id: 'o', title: 'Globex', type: 'organisation' },
        ],
        edges: [
          { source: 'moi', target: 'p', relation: 'en_couple_avec', isClosed: false },
          { source: 'p', target: 'o', relation: 'travaille_chez', isClosed: true, seen: TODAY },
        ],
      },
      TODAY,
      'half-life',
    );
    expect(renderable).toEqual({
      nodes: [
        {
          id: 'moi',
          title: 'Alex',
          colorVariable: '--color-node-person',
          targetRadius: 0,
          fx: 0,
          fy: 0,
        },
        { id: 'p', title: 'Lucie', colorVariable: '--color-node-person', targetRadius: 80 },
        { id: 'o', title: 'Globex', colorVariable: '--color-node-organization', targetRadius: 215 },
      ],
      links: [
        {
          source: 'moi',
          target: 'p',
          distance: 60,
          strength: 0.08000000000000002,
          isClosed: false,
        },
        { source: 'p', target: 'o', distance: 195, strength: 0.03, isClosed: true },
      ],
    });
  });
});

describe('computeRadialPull', () => {
  it('pushes a node inside its circle outwards along its radius', () => {
    const pull = computeRadialPull({ x: 30, y: 40 }, 100, 0.5, 1);
    expect(pull.vx).toBeCloseTo(15, 5);
    expect(pull.vy).toBeCloseTo(20, 5);
  });

  it('pulls a node outside its circle inwards, scaled by alpha', () => {
    const pull = computeRadialPull({ x: 150, y: 200 }, 125, 1, 0.5);
    expect(pull).toEqual({ vx: -37.5, vy: -50 });
  });

  it('leaves a node on its circle where it is', () => {
    expect(computeRadialPull({ x: 60, y: 80 }, 100, 1, 1)).toEqual({ vx: 0, vy: 0 });
  });

  it('does not divide by zero for a node exactly at the centre', () => {
    expect(computeRadialPull({ x: 0, y: 0 }, 100, 1, 1)).toEqual({ vx: 0, vy: 0 });
  });
});

describe('selectLinkColorVariable', () => {
  it('draws a closed relation paler', () => {
    expect(selectLinkColorVariable(true)).toBe('--color-line');
    expect(selectLinkColorVariable(false)).toBe('--color-line-strong');
  });
});

describe('isConfigurableLinkForce', () => {
  const settable = () => undefined;

  it('recognises a force that sets both distance and strength', () => {
    expect(
      isConfigurableLinkForce(
        Object.assign(() => undefined, { distance: settable, strength: settable }),
      ),
    ).toBe(true);
  });

  it.each([
    ['nothing', undefined],
    ['an object', { distance: settable, strength: settable }],
    ['a force without distance', Object.assign(() => undefined, { strength: settable })],
    ['a force without strength', Object.assign(() => undefined, { distance: settable })],
    [
      'a force with a fixed distance',
      Object.assign(() => undefined, { distance: 30, strength: settable }),
    ],
    [
      'a force with a fixed strength',
      Object.assign(() => undefined, { distance: settable, strength: 1 }),
    ],
  ])('refuses %s', (_label, force) => {
    expect(isConfigurableLinkForce(force)).toBe(false);
  });
});

describe('isConfigurableChargeForce', () => {
  it('recognises a force that sets its strength', () => {
    expect(
      isConfigurableChargeForce(Object.assign(() => undefined, { strength: () => undefined })),
    ).toBe(true);
  });

  it.each([
    ['nothing', null],
    ['an object', { strength: () => undefined }],
    ['a force without strength', () => undefined],
    ['a force with a fixed strength', Object.assign(() => undefined, { strength: -30 })],
  ])('refuses %s', (_label, force) => {
    expect(isConfigurableChargeForce(force)).toBe(false);
  });
});

describe('computeCentredZoom', () => {
  it('fits the outermost node inside the smaller half of the viewport, padding kept', () => {
    const zoom = computeCentredZoom(
      [
        { x: 0, y: 0 },
        { x: 30, y: 40 },
        { x: -60, y: 80 },
      ],
      { width: 248, height: 500 },
      24,
    );
    expect(zoom).toBe(1);
  });

  it('treats a missing coordinate as the centre', () => {
    expect(computeCentredZoom([{ x: 50 }, { y: -100 }, {}], { width: 400, height: 400 }, 0)).toBe(
      2,
    );
  });

  it('keeps the default zoom when every node sits at the centre', () => {
    expect(computeCentredZoom([{ x: 0, y: 0 }], { width: 400, height: 400 }, 10)).toBe(1);
    expect(computeCentredZoom([], { width: 400, height: 400 }, 10)).toBe(1);
  });
});
