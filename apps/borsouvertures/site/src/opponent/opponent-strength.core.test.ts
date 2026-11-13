import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPPONENT_STRENGTH,
  isOpponentStrengthId,
  listOpponentStrengthSteps,
  listStrengthCommands,
  toOpponentStrengthId,
} from './opponent-strength.core';

// @FollowsBlueprint test-pure-unit
describe('the opponent strength table', () => {
  it('lists three easier steps without a rating, then seven rated steps from 1320 to 2500', () => {
    expect(listOpponentStrengthSteps()).toEqual([
      { id: 'skill-0', family: 'skill-level', level: 0 },
      { id: 'skill-3', family: 'skill-level', level: 3 },
      { id: 'skill-6', family: 'skill-level', level: 6 },
      { id: 'elo-1320', family: 'rating', level: 1320 },
      { id: 'elo-1500', family: 'rating', level: 1500 },
      { id: 'elo-1700', family: 'rating', level: 1700 },
      { id: 'elo-1900', family: 'rating', level: 1900 },
      { id: 'elo-2000', family: 'rating', level: 2000 },
      { id: 'elo-2200', family: 'rating', level: 2200 },
      { id: 'elo-2500', family: 'rating', level: 2500 },
    ]);
  });

  it('defaults to the 2000 step', () => {
    expect(DEFAULT_OPPONENT_STRENGTH).toBe('elo-2000');
  });

  it('sets the skill level with the strength limit off on an easier step', () => {
    expect(listStrengthCommands('skill-3')).toEqual([
      'setoption name UCI_LimitStrength value false',
      'setoption name Skill Level value 3',
    ]);
  });

  it('sets the rating with the strength limit on on a rated step', () => {
    expect(listStrengthCommands('elo-1320')).toEqual([
      'setoption name UCI_LimitStrength value true',
      'setoption name UCI_Elo value 1320',
    ]);
  });

  it('sends one option family per step, never both', () => {
    for (const step of listOpponentStrengthSteps()) {
      const commands = listStrengthCommands(step.id).join('\n');
      expect(commands.includes('Skill Level')).toBe(step.family === 'skill-level');
      expect(commands.includes('UCI_Elo')).toBe(step.family === 'rating');
    }
  });

  it('recognises a step id and nothing else', () => {
    expect(isOpponentStrengthId('elo-1900')).toBe(true);
    expect(isOpponentStrengthId('elo-2100')).toBe(false);
    expect(isOpponentStrengthId(1320)).toBe(false);
  });

  it('keeps the current step when a selected value is not a step', () => {
    expect(toOpponentStrengthId('skill-6', 'elo-1320')).toBe('skill-6');
    expect(toOpponentStrengthId('', 'elo-1500')).toBe('elo-1500');
  });
});
