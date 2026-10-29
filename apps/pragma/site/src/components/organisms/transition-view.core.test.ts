import { describe, expect, it } from 'vitest';
import {
  buildTransitionView,
  buildTransitionViews,
  indexTransitionComments,
  transitionPairKey,
} from './transition-view.core';

const MEMBERS = {
  hugo: { firstName: 'Hugo', color: '#111111' },
  lea: { firstName: 'Léa', color: '#222222' },
};

const INSTRUMENTS = {
  guitar: { name: 'Guitare' },
  drums: { name: 'Batterie' },
  vocals: { name: 'Chant' },
};

// @FollowsBlueprint test-pure-unit
describe('buildTransitionView', () => {
  it('reads the harmonic carriers first and the support ones behind them', () => {
    const view = buildTransitionView(
      {
        kind: 'covered',
        harmonicCarriers: [{ memberId: 'lea', keptInstrumentIds: ['guitar'] }],
        supportCarriers: [{ memberId: 'hugo', keptInstrumentIds: ['drums', 'vocals'] }],
      },
      MEMBERS,
      INSTRUMENTS,
    );
    expect(view).toEqual({
      kind: 'covered',
      carriers: [
        {
          memberId: 'lea',
          memberName: 'Léa',
          memberColor: '#222222',
          instrumentNames: ['Guitare'],
          role: 'harmonic',
        },
        {
          memberId: 'hugo',
          memberName: 'Hugo',
          memberColor: '#111111',
          instrumentNames: ['Batterie', 'Chant'],
          role: 'support',
        },
      ],
    });
  });

  it('carries the risky verdict through with nobody named', () => {
    expect(
      buildTransitionView(
        { kind: 'risky', harmonicCarriers: [], supportCarriers: [] },
        MEMBERS,
        INSTRUMENTS,
      ),
    ).toEqual({ kind: 'risky', carriers: [] });
  });

  it('drops a carrier whose member left the band', () => {
    const view = buildTransitionView(
      {
        kind: 'covered',
        harmonicCarriers: [{ memberId: 'ghost', keptInstrumentIds: ['guitar'] }],
        supportCarriers: [],
      },
      MEMBERS,
      INSTRUMENTS,
    );
    expect(view.carriers).toEqual([]);
  });

  it('drops an instrument the band no longer has, keeping the carrier', () => {
    const view = buildTransitionView(
      {
        kind: 'covered',
        harmonicCarriers: [{ memberId: 'lea', keptInstrumentIds: ['guitar', 'kazoo'] }],
        supportCarriers: [],
      },
      MEMBERS,
      INSTRUMENTS,
    );
    expect(view.carriers[0]?.instrumentNames).toEqual(['Guitare']);
  });
});

describe('transitionPairKey', () => {
  it('keys the ordered pair, so A to B is not B to A', () => {
    expect(transitionPairKey('a', 'b')).not.toBe(transitionPairKey('b', 'a'));
  });
});

describe('indexTransitionComments', () => {
  it('keys every stored comment by its ordered pair', () => {
    expect(
      indexTransitionComments([
        { songAId: 'a', songBId: 'b', comment: 'first' },
        { songAId: 'b', songBId: 'c', comment: 'second' },
      ]),
    ).toEqual({ 'a::b': 'first', 'b::c': 'second' });
  });

  it('answers an empty index when nothing is stored', () => {
    expect(indexTransitionComments([])).toEqual({});
  });
});

describe('buildTransitionViews', () => {
  it('judges each pair of neighbouring entries, one view fewer than entries', () => {
    const songsById = {
      one: { id: 'one', title: 'One', artist: '', defaultLineup: { anna: ['bass'] } },
      two: { id: 'two', title: 'Two', artist: '', defaultLineup: { anna: ['bass'] } },
    };
    const views = buildTransitionViews({
      entries: [
        { songId: 'one', lineupOverride: null },
        { songId: 'two', lineupOverride: null },
        { songId: 'lost', lineupOverride: null },
      ],
      songsById,
      instruments: [{ id: 'bass', name: 'Bass', family: 'harmonic' }],
      membersById: { anna: { firstName: 'Anna', color: '#e07a5f' } },
      instrumentsById: { bass: { name: 'Bass' } },
    });
    expect(views).toHaveLength(2);
    expect(views[0]?.carriers.map((carrier) => carrier.memberName)).toEqual(['Anna']);
  });

  it('returns no view for a setlist of one song or none', () => {
    const input = {
      songsById: {},
      instruments: [],
      membersById: {},
      instrumentsById: {},
    };
    expect(buildTransitionViews({ ...input, entries: [] })).toEqual([]);
    expect(
      buildTransitionViews({ ...input, entries: [{ songId: 'one', lineupOverride: null }] }),
    ).toEqual([]);
  });
});
