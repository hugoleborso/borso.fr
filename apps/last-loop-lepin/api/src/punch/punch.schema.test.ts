/**
 * Every punch body names an edition and a runner; the differences are the
 * bounds each one adds, and the coordinate ranges are the ones a phone can
 * plausibly report.
 */

import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  catchupPunchInputSchema,
  correctPunchInputSchema,
  createDidNotFinishInputSchema,
  createPunchInputSchema,
  manualDidNotFinishesTable,
  selfPunchInputSchema,
} from './punch.schema';

const editionSlug = 'lepin-2026';
const runnerSlug = 'alice';

describe('createPunchInputSchema', () => {
  it('names the edition and the runner, both as slugs', () => {
    expect(createPunchInputSchema.safeParse({ editionSlug, runnerSlug }).success).toBe(true);
    expect(createPunchInputSchema.safeParse({ editionSlug: 'Lepin', runnerSlug }).success).toBe(
      false,
    );
  });
});

describe('correctPunchInputSchema', () => {
  it('needs a timestamp carrying its offset', () => {
    expect(
      correctPunchInputSchema.safeParse({ finishedAt: '2026-09-19T07:00:00+02:00' }).success,
    ).toBe(true);
    expect(correctPunchInputSchema.safeParse({ finishedAt: '2026-09-19' }).success).toBe(false);
  });
});

describe('catchupPunchInputSchema', () => {
  it('needs a loop number that counts from one', () => {
    expect(
      catchupPunchInputSchema.safeParse({ editionSlug, runnerSlug, loopIndex: 1 }).success,
    ).toBe(true);
    for (const loopIndex of [0, -1, 1.5]) {
      expect(
        catchupPunchInputSchema.safeParse({ editionSlug, runnerSlug, loopIndex }).success,
      ).toBe(false);
    }
  });
});

describe('selfPunchInputSchema', () => {
  it('accepts a punch with no position at all', () => {
    expect(
      selfPunchInputSchema.safeParse({
        editionSlug,
        runnerSlug,
        clientLat: null,
        clientLng: null,
        clientAccuracyM: null,
      }).success,
    ).toBe(true);
  });

  it('accepts coordinates inside the ranges a phone reports', () => {
    expect(
      selfPunchInputSchema.safeParse({
        editionSlug,
        runnerSlug,
        clientLat: 45.1,
        clientLng: 5.7,
        clientAccuracyM: 12,
      }).success,
    ).toBe(true);
  });

  it('refuses a latitude or longitude off the globe', () => {
    const base = { editionSlug, runnerSlug, clientLng: 5.7, clientAccuracyM: 0 };
    expect(selfPunchInputSchema.safeParse({ ...base, clientLat: 91 }).success).toBe(false);
    expect(selfPunchInputSchema.safeParse({ ...base, clientLat: -91 }).success).toBe(false);
    expect(
      selfPunchInputSchema.safeParse({ ...base, clientLat: 45.1, clientLng: 181 }).success,
    ).toBe(false);
  });

  it('refuses a negative accuracy, which no reading produces', () => {
    expect(
      selfPunchInputSchema.safeParse({
        editionSlug,
        runnerSlug,
        clientLat: null,
        clientLng: null,
        clientAccuracyM: -1,
      }).success,
    ).toBe(false);
  });

  it('refuses a punch that omits the position fields rather than nulling them', () => {
    expect(selfPunchInputSchema.safeParse({ editionSlug, runnerSlug }).success).toBe(false);
  });
});

describe('createDidNotFinishInputSchema', () => {
  it('accepts a pre-race abandon at loop zero', () => {
    expect(
      createDidNotFinishInputSchema.safeParse({
        editionSlug,
        runnerSlug,
        outAtLoop: 0,
        reason: 'manual',
      }).success,
    ).toBe(true);
  });

  it('refuses a loop below zero, which names no moment in the race', () => {
    expect(
      createDidNotFinishInputSchema.safeParse({
        editionSlug,
        runnerSlug,
        outAtLoop: -1,
        reason: 'late',
      }).success,
    ).toBe(false);
  });

  it('accepts only the two reasons a runner leaves', () => {
    for (const reason of ['late', 'manual']) {
      expect(
        createDidNotFinishInputSchema.safeParse({ editionSlug, runnerSlug, outAtLoop: 3, reason })
          .success,
      ).toBe(true);
    }
    expect(
      createDidNotFinishInputSchema.safeParse({
        editionSlug,
        runnerSlug,
        outAtLoop: 3,
        reason: 'injured',
      }).success,
    ).toBe(false);
  });
});

describe('the manual abandon table', () => {
  it('is keyed by edition and runner, so one runner leaves a race once', () => {
    const [primary] = getTableConfig(manualDidNotFinishesTable).primaryKeys;
    expect(primary?.columns.map((column) => column.name)).toEqual(['edition_slug', 'runner_slug']);
  });
});
