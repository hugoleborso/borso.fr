import { describe, expect, it } from 'vitest';
import {
  parseDateTimeLocalValue,
  readSessionChoice,
  selectQueueFailure,
  selectNearestPractice,
  selectPracticeOptions,
  selectTakeFileMessage,
  takeUploadFormSchema,
  toDateTimeLocalValue,
} from './take-upload-form.core';

const RECORDED_AT = new Date('2026-10-18T20:00:00.000Z');
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function practiceAt(id: string, offsetMilliseconds: number) {
  return {
    id,
    kind: 'practice',
    date: new Date(RECORDED_AT.getTime() + offsetMilliseconds).toISOString(),
  };
}

// @FollowsBlueprint test-pure-unit
describe('selectNearestPractice', () => {
  it('preselects a practice up to a day away', () => {
    expect(selectNearestPractice([practiceAt('p', DAY - MINUTE)], RECORDED_AT)).toBe('p');
    expect(selectNearestPractice([practiceAt('p', -DAY)], RECORDED_AT)).toBe('p');
  });

  it('preselects nothing past a day', () => {
    expect(selectNearestPractice([practiceAt('p', DAY + MINUTE)], RECORDED_AT)).toBeNull();
    expect(selectNearestPractice([practiceAt('p', -DAY - 1)], RECORDED_AT)).toBeNull();
  });

  it('picks the closest practice and ignores concerts', () => {
    const concert = { ...practiceAt('concert', 0), kind: 'concert' };
    const sessions = [
      practiceAt('far', -3 * 60 * MINUTE),
      concert,
      practiceAt('near', 30 * MINUTE),
      practiceAt('same-distance', -30 * MINUTE),
    ];
    expect(selectNearestPractice(sessions, RECORDED_AT)).toBe('near');
  });

  it('preselects nothing without a practice', () => {
    expect(selectNearestPractice([], RECORDED_AT)).toBeNull();
  });
});

describe('selectPracticeOptions', () => {
  it('lists the practices only, most recent first', () => {
    const concert = { ...practiceAt('concert', 0), kind: 'concert' };
    const options = selectPracticeOptions([
      practiceAt('old', -DAY),
      concert,
      practiceAt('new', DAY),
    ]);
    expect(options.map((option) => option.id)).toEqual(['new', 'old']);
  });
});

describe('date-time field values', () => {
  it('writes a local date and time to the minute and reads it back', () => {
    const date = new Date(2026, 9, 3, 7, 5, 42);
    expect(toDateTimeLocalValue(date)).toBe('2026-10-03T07:05');
    expect(parseDateTimeLocalValue('2026-10-03T07:05')?.getTime()).toBe(
      new Date(2026, 9, 3, 7, 5).getTime(),
    );
  });

  it('reads nothing from a malformed or impossible value', () => {
    expect(parseDateTimeLocalValue('')).toBeNull();
    expect(parseDateTimeLocalValue('2026-10-03 07:05')).toBeNull();
    expect(parseDateTimeLocalValue('x2026-10-03T07:05')).toBeNull();
    expect(parseDateTimeLocalValue('2026-10-03T07:05x')).toBeNull();
    expect(parseDateTimeLocalValue('2026-13-45T99:99')).toBeNull();
  });
});

describe('takeUploadFormSchema', () => {
  const AUDIO = new File(['abc'], 'take.m4a', { type: 'audio/mp4' });

  it('accepts an audio file with a valid recording time', () => {
    expect(
      takeUploadFormSchema.safeParse({ file: AUDIO, recordedAt: '2026-10-03T07:05', sessionId: '' })
        .success,
    ).toBe(true);
  });

  it('refuses a missing file, a file that is not audio, and a bad time', () => {
    const notAudio = new File(['abc'], 'notes.txt', { type: 'text/plain' });
    const base = { file: AUDIO, recordedAt: '2026-10-03T07:05', sessionId: '' };
    expect(takeUploadFormSchema.safeParse({ ...base, file: null }).success).toBe(false);
    expect(takeUploadFormSchema.safeParse({ ...base, file: notAudio }).success).toBe(false);
    expect(takeUploadFormSchema.safeParse({ ...base, recordedAt: 'soon' }).success).toBe(false);
  });
});

describe('selectTakeFileMessage', () => {
  it('says nothing before a file is chosen, or for a good one', () => {
    expect(selectTakeFileMessage(null)).toBeNull();
    expect(selectTakeFileMessage({ type: 'audio/mp4', size: 10 })).toBeNull();
  });

  it('names the limit for a file over it', () => {
    expect(selectTakeFileMessage({ type: 'audio/mp4', size: 50 * 1024 * 1024 + 1 })).toEqual({
      key: 'takes.fileErrors.tooLarge',
      maxMebibytes: 50,
    });
  });

  it('refuses a file that is not audio, and an empty one', () => {
    expect(selectTakeFileMessage({ type: 'text/plain', size: 10 })).toEqual({
      key: 'takes.fileErrors.notAudio',
    });
    expect(selectTakeFileMessage({ type: 'audio/mp4', size: 0 })).toEqual({
      key: 'takes.fileErrors.empty',
    });
  });
});

describe('readSessionChoice', () => {
  it('reads the empty choice as no session', () => {
    expect(readSessionChoice('')).toBeNull();
    expect(readSessionChoice('session-1')).toBe('session-1');
  });
});

describe('selectQueueFailure', () => {
  it('reports nothing for a queued take, and the reason otherwise', () => {
    expect(selectQueueFailure('queued')).toBeNull();
    expect(selectQueueFailure('quota-exceeded')).toBe('quota-exceeded');
  });
});
