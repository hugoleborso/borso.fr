import { describe, expect, it } from 'vitest';
import {
  buildSceneTransition,
  describeSceneTransitionMember,
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
      putDown: [],
      pickUp: [{ instrumentId: 'drums', name: 'Drums', icon: 'drum' }],
    });
  });

  it('shows a member who changes with what they put down and what they pick up', () => {
    const [hugo] = transitionOf({ hugo: ['piano'] }, { hugo: ['bass'] }).members;
    expect(hugo?.move).toBe('changes');
    expect(hugo?.putDown.map((part) => part.icon)).toEqual(['piano']);
    expect(hugo?.pickUp.map((part) => part.icon)).toEqual(['bass']);
  });

  it('shows a member who joins with nothing put down', () => {
    const [emma] = transitionOf({}, { emma: ['piano'] }).members;
    expect(emma?.move).toBe('joins');
    expect(emma?.putDown).toEqual([]);
  });

  it('reads a member who swaps one of two instruments as a change, drawn with an arrow', () => {
    const [hugo] = transitionOf({ hugo: ['piano', 'drums'] }, { hugo: ['piano', 'bass'] }).members;
    expect(hugo?.move).toBe('changes');
    expect(hugo?.hasArrow).toBe(true);
  });

  it('reads a member who adds an instrument as a change', () => {
    const [hugo] = transitionOf({ hugo: ['piano'] }, { hugo: ['piano', 'bass'] }).members;
    expect(hugo?.move).toBe('changes');
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

describe('describeSceneTransitionMember', () => {
  it('names what a member keeps', () => {
    const [gui] = transitionOf({ gui: ['drums'] }, { gui: ['drums'] }).members;
    expect(gui && describeSceneTransitionMember(gui)).toBe('Gui: Drums');
  });

  it('names what a member puts down and picks up', () => {
    const [hugo] = transitionOf({ hugo: ['piano'] }, { hugo: ['bass', 'drums'] }).members;
    expect(hugo && describeSceneTransitionMember(hugo)).toBe('Hugo: Piano → Drums, Bass');
  });

  it('names what a joining member picks up', () => {
    const [emma] = transitionOf({}, { emma: ['piano'] }).members;
    expect(emma && describeSceneTransitionMember(emma)).toBe('Emma: → Piano');
  });
});
