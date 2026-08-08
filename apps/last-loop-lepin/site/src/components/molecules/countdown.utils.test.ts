import { describe, expect, it } from 'vitest';
import { projectCountdownDisplay } from './countdown.utils';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

describe('projectCountdownDisplay', () => {
  it('clamps a duration that has already elapsed to zero', () => {
    const display = projectCountdownDisplay(-5 * MINUTE_MS);
    expect(display.leftDigits).toEqual(['0', '0']);
    expect(display.rightDigits).toEqual(['0', '0']);
    expect(display.format).toBe('MM:SS');
  });

  it('reads minutes and seconds below the hour and minute threshold', () => {
    const display = projectCountdownDisplay(9 * MINUTE_MS + 5 * SECOND_MS);
    expect(display.leftDigits).toEqual(['0', '9']);
    expect(display.rightDigits).toEqual(['0', '5']);
    expect(display.format).toBe('MM:SS');
  });

  it('still reads minutes and seconds one second before the threshold', () => {
    const display = projectCountdownDisplay(100 * MINUTE_MS - SECOND_MS);
    expect(display.format).toBe('MM:SS');
    expect(display.leftDigits).toEqual(['9', '9']);
  });

  it('switches to hours and minutes at the threshold', () => {
    const display = projectCountdownDisplay(100 * MINUTE_MS);
    expect(display.format).toBe('HH:MM');
    expect(display.leftDigits).toEqual(['0', '1']);
    expect(display.rightDigits).toEqual(['4', '0']);
  });

  it('caps the hour pair at ninety nine', () => {
    const display = projectCountdownDisplay(150 * HOUR_MS);
    expect(display.leftDigits).toEqual(['9', '9']);
  });

  it('announces the value and the format together', () => {
    const display = projectCountdownDisplay(3 * MINUTE_MS + 7 * SECOND_MS);
    expect(display.accessibleValue).toBe('03:07 MM:SS');
  });
});
