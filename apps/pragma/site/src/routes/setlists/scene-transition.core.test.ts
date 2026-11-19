import { describe, expect, it } from 'vitest';
import {
  buildSceneTransition,
  describeSceneTransitionLineup,
  type SceneTransitionInstrumentInput,
} from './scene-transition.core';

const DRUMS: SceneTransitionInstrumentInput = {
  id: 'drums',
  name: 'Drums',
  icon: 'drum',
  family: 'percussive',
};
const PIANO: SceneTransitionInstrumentInput = {
  id: 'piano',
  name: 'Piano',
  icon: 'piano',
  family: 'harmonic',
};
const BASS: SceneTransitionInstrumentInput = {
  id: 'bass',
  name: 'Bass',
  icon: 'bass',
  family: 'harmonic',
};
const INSTRUMENTS = [DRUMS, PIANO, BASS];
const GUI = { id: 'gui', firstName: 'Gui', color: '#3a9b9b' };
const HUGO = { id: 'hugo', firstName: 'Hugo', color: '#e87b62' };
const EMMA = { id: 'emma', firstName: 'Emma', color: '#8a4f7a' };
const MEMBERS = [GUI, HUGO, EMMA];

function transitionOf(
  currentLineup: Record<string, readonly string[]>,
  nextLineup: Record<string, readonly string[]>,
) {
  return buildSceneTransition({
    currentLineup,
    nextLineup,
    members: MEMBERS,
    instruments: INSTRUMENTS,
  });
}

// @FollowsBlueprint test-pure-unit
describe('buildSceneTransition', () => {
  it('shows a member who keeps an instrument with only what they keep', () => {
    const [gui] = transitionOf({ gui: ['drums'] }, { gui: ['drums'] }).members;
    expect(gui).toEqual({
      memberId: 'gui',
      firstName: 'Gui',
      color: '#3a9b9b',
      move: 'keeps',
      hasArrow: false,
      kept: [{ instrumentId: 'drums', name: 'Drums', icon: 'drum' }],
      putDown: [],
      pickUp: [],
    });
  });

  it('shows a member who changes with what they put down and what they pick up', () => {
    const [hugo] = transitionOf({ hugo: ['piano'] }, { hugo: ['bass'] }).members;
    expect(hugo?.move).toBe('changes');
    expect(hugo?.putDown.map((part) => part.icon)).toEqual(['piano']);
    expect(hugo?.pickUp.map((part) => part.icon)).toEqual(['bass']);
  });

  it('shows a member who joins with an arrow to what they pick up', () => {
    const [emma] = transitionOf({}, { emma: ['piano'] }).members;
    expect(emma?.move).toBe('joins');
    expect(emma?.hasArrow).toBe(true);
    expect(emma?.putDown).toEqual([]);
    expect(emma?.pickUp.map((part) => part.icon)).toEqual(['piano']);
  });

  it('keeps an instrument held on both songs off both sides of the arrow', () => {
    const [hugo] = transitionOf({ hugo: ['drums', 'piano'] }, { hugo: ['drums'] }).members;
    expect(hugo?.kept.map((part) => part.icon)).toEqual(['drum']);
    expect(hugo?.putDown.map((part) => part.icon)).toEqual(['piano']);
    expect(hugo?.pickUp).toEqual([]);
  });

  it('reads a member who swaps one of two instruments as a change, drawn with an arrow', () => {
    const [hugo] = transitionOf({ hugo: ['piano', 'drums'] }, { hugo: ['piano', 'bass'] }).members;
    expect(hugo?.move).toBe('changes');
    expect(hugo?.hasArrow).toBe(true);
  });

  it('reads a member who adds an instrument as a change', () => {
    const [hugo] = transitionOf({ hugo: ['piano'] }, { hugo: ['piano', 'bass'] }).members;
    expect(hugo?.move).toBe('changes');
    expect(hugo?.kept.map((part) => part.icon)).toEqual(['piano']);
    expect(hugo?.pickUp.map((part) => part.icon)).toEqual(['bass']);
  });

  it('leaves out a member who sits out the next song, and keeps the members order', () => {
    const transition = transitionOf(
      { gui: ['drums'], hugo: ['piano'], emma: ['bass'] },
      { emma: ['bass'], gui: ['drums'] },
    );
    expect(transition.members.map((member) => member.memberId)).toEqual(['gui', 'emma']);
  });

  it('says the gap is covered while someone keeps a harmonic instrument', () => {
    expect(transitionOf({ hugo: ['piano'] }, { hugo: ['piano'] }).isRisky).toBe(false);
  });

  it('says the gap is risky when nobody keeps an instrument', () => {
    expect(transitionOf({ hugo: ['piano'] }, { hugo: ['bass'] }).isRisky).toBe(true);
  });
});

function lineupOf(
  current: Record<string, readonly string[]>,
  next: Record<string, readonly string[]>,
): string {
  const [member] = transitionOf(current, next).members;
  if (member === undefined) throw new TypeError('no member plays the next song');
  return describeSceneTransitionLineup(member);
}

describe('describeSceneTransitionLineup', () => {
  it('names what a member keeps', () => {
    expect(lineupOf({ gui: ['drums'] }, { gui: ['drums'] })).toBe('Drums');
  });

  it('names what a member puts down and picks up', () => {
    expect(lineupOf({ hugo: ['piano'] }, { hugo: ['bass', 'drums'] })).toBe('Piano → Drums, Bass');
  });

  it('names what a member keeps before what they change', () => {
    expect(lineupOf({ hugo: ['drums', 'piano'] }, { hugo: ['drums'] })).toBe('Drums (Piano →)');
  });

  it('names what a joining member picks up', () => {
    expect(lineupOf({}, { emma: ['piano'] })).toBe('→ Piano');
  });

  it('names what a member keeps before what they pick up', () => {
    expect(lineupOf({ hugo: ['piano'] }, { hugo: ['piano', 'bass'] })).toBe('Piano (→ Bass)');
  });
});
