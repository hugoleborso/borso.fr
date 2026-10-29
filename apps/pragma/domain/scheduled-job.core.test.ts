import { describe, expect, it } from 'vitest';
import { STREAK_REMINDER_JOB } from './scheduled-job.core';

// @FollowsBlueprint test-pure-unit
describe('STREAK_REMINDER_JOB', () => {
  it('names the job the 20:00 schedule sends and the API entry point routes', () => {
    expect(STREAK_REMINDER_JOB).toBe('streak-reminder');
  });
});
