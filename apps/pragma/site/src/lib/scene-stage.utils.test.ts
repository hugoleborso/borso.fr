import { describe, expect, it } from 'vitest';
import { isEventFromItself } from './scene-stage.utils';

describe('isEventFromItself', () => {
  const stage = new EventTarget();

  it('is true for an event the element raised itself', () => {
    expect(isEventFromItself(stage, stage)).toBe(true);
  });

  it('is false for an event a nested element raised', () => {
    expect(isEventFromItself(new EventTarget(), stage)).toBe(false);
  });
});
