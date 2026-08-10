import { describe, expect, it } from 'vitest';
import type { PlayScope } from '@/state/persistedState.utils';
import { buildOpeningFlowLists } from './openingFlow.core';
import { EMPTY_PLAY_SCOPE, FULL_SELECTION } from './playScope.core';
import { ALL_KEY, type Selection } from './selectors.utils';
import type { Line, Opening } from './types';

function buildLine(id: string): Line {
  return { id, name: id, eco: 'C50', movesSan: [], movesUci: [] };
}

const OPENINGS: Opening[] = [
  {
    id: 'italian',
    name: 'Italian Game',
    ecoCodes: ['C50'],
    variations: [
      { id: 'classical', name: 'Classical', lines: [buildLine('greco'), buildLine('center')] },
      { id: 'two-knights', name: 'Two Knights', lines: [buildLine('fried-liver')] },
    ],
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    ecoCodes: ['C60'],
    variations: [{ id: 'berlin', name: 'Berlin', lines: [buildLine('berlin-wall')] }],
  },
];

function listVariationIds(entries: readonly { variation: { id: string } }[]): string[] {
  return entries.map((entry) => entry.variation.id);
}

function listLineIds(entries: readonly { line: { id: string } }[]): string[] {
  return entries.map((entry) => entry.line.id);
}

// @FollowsBlueprint test-pure-unit
describe('buildOpeningFlowLists in play mode', () => {
  it('spans every opening when the scope is empty', () => {
    const lists = buildOpeningFlowLists('play', OPENINGS, FULL_SELECTION, EMPTY_PLAY_SCOPE);
    expect(listVariationIds(lists.variationEntries)).toEqual([
      'classical',
      'two-knights',
      'berlin',
    ]);
    expect(listLineIds(lists.lineEntries)).toEqual([
      'greco',
      'center',
      'fried-liver',
      'berlin-wall',
    ]);
  });

  it('narrows to the openings in the scope', () => {
    const scope: PlayScope = { openingIds: ['ruy-lopez'], variationIds: [], lineIds: [] };
    const lists = buildOpeningFlowLists('play', OPENINGS, FULL_SELECTION, scope);
    expect(listVariationIds(lists.variationEntries)).toEqual(['berlin']);
    expect(listLineIds(lists.lineEntries)).toEqual(['berlin-wall']);
  });

  it('narrows the lines to the variations in the scope', () => {
    const scope: PlayScope = {
      openingIds: [],
      variationIds: ['two-knights'],
      lineIds: [],
    };
    const lists = buildOpeningFlowLists('play', OPENINGS, FULL_SELECTION, scope);
    expect(listLineIds(lists.lineEntries)).toEqual(['fried-liver']);
  });

  it('shows the same lists in the panels as in the totals', () => {
    const lists = buildOpeningFlowLists('play', OPENINGS, FULL_SELECTION, EMPTY_PLAY_SCOPE);
    expect(lists.panelVariationEntries).toBe(lists.variationEntries);
    expect(lists.panelLineEntries).toBe(lists.lineEntries);
  });
});

describe('buildOpeningFlowLists in learn mode', () => {
  it('shows no variations and no lines until an opening is picked', () => {
    const lists = buildOpeningFlowLists('learn', OPENINGS, FULL_SELECTION, EMPTY_PLAY_SCOPE);
    expect(lists.panelVariationEntries).toEqual([]);
    expect(lists.panelLineEntries).toEqual([]);
    expect(listVariationIds(lists.variationEntries)).toEqual([
      'classical',
      'two-knights',
      'berlin',
    ]);
  });

  it('shows the variations of the picked opening', () => {
    const selection: Selection = {
      openingId: 'italian',
      variationId: ALL_KEY,
      lineId: ALL_KEY,
    };
    const lists = buildOpeningFlowLists('learn', OPENINGS, selection, EMPTY_PLAY_SCOPE);
    expect(listVariationIds(lists.panelVariationEntries)).toEqual(['classical', 'two-knights']);
    expect(lists.panelLineEntries).toEqual([]);
  });

  it('counts only the picked opening once one is picked', () => {
    const selection: Selection = {
      openingId: 'italian',
      variationId: ALL_KEY,
      lineId: ALL_KEY,
    };
    const lists = buildOpeningFlowLists('learn', OPENINGS, selection, EMPTY_PLAY_SCOPE);
    expect(listVariationIds(lists.variationEntries)).toEqual(['classical', 'two-knights']);
    expect(listLineIds(lists.lineEntries)).toEqual(['greco', 'center', 'fried-liver']);
  });

  it('shows the lines of the picked variation', () => {
    const selection: Selection = {
      openingId: 'italian',
      variationId: 'classical',
      lineId: ALL_KEY,
    };
    const lists = buildOpeningFlowLists('learn', OPENINGS, selection, EMPTY_PLAY_SCOPE);
    expect(listLineIds(lists.panelLineEntries)).toEqual(['greco', 'center']);
  });

  it('ignores the play scope', () => {
    const scope: PlayScope = { openingIds: ['ruy-lopez'], variationIds: ['berlin'], lineIds: [] };
    const selection: Selection = {
      openingId: 'italian',
      variationId: 'classical',
      lineId: ALL_KEY,
    };
    const lists = buildOpeningFlowLists('learn', OPENINGS, selection, scope);
    expect(listLineIds(lists.panelLineEntries)).toEqual(['greco', 'center']);
    expect(listVariationIds(lists.variationEntries)).toEqual(['classical', 'two-knights']);
    expect(listLineIds(lists.lineEntries)).toEqual(['greco', 'center', 'fried-liver']);
  });

  it('shows no lines when the picked variation belongs to another opening', () => {
    const selection: Selection = {
      openingId: 'italian',
      variationId: 'berlin',
      lineId: ALL_KEY,
    };
    const lists = buildOpeningFlowLists('learn', OPENINGS, selection, EMPTY_PLAY_SCOPE);
    expect(lists.panelLineEntries).toEqual([]);
  });
});
