import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  IMPROVEMENT_STATUSES,
  improvementCreateSchema,
  improvementIdParamSchema,
  improvementUpdateSchema,
  improvementVoteTable,
} from './improvements.schema';

const TITLE_MAXIMUM_LENGTH = 200;

describe('improvementCreateSchema', () => {
  it('accepts a title alone and files it as an idea with no details', () => {
    const filedImprovement = improvementCreateSchema.parse({ title: 'Offline setlists' });
    expect(filedImprovement.status).toBe('idea');
    expect(filedImprovement.details).toBe('');
  });

  it('trims the title, so whitespace alone is not a title', () => {
    expect(improvementCreateSchema.parse({ title: '  Dark mode  ' }).title).toBe('Dark mode');
    expect(improvementCreateSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('refuses a title past the ceiling and accepts one exactly at it', () => {
    expect(
      improvementCreateSchema.safeParse({ title: 'a'.repeat(TITLE_MAXIMUM_LENGTH) }).success,
    ).toBe(true);
    expect(
      improvementCreateSchema.safeParse({ title: 'a'.repeat(TITLE_MAXIMUM_LENGTH + 1) }).success,
    ).toBe(false);
  });

  it('accepts every status the backlog declares and nothing else', () => {
    for (const status of IMPROVEMENT_STATUSES) {
      expect(improvementCreateSchema.safeParse({ title: 'x', status }).success).toBe(true);
    }
    expect(improvementCreateSchema.safeParse({ title: 'x', status: 'wontfix' }).success).toBe(
      false,
    );
  });
});

describe('improvementUpdateSchema', () => {
  it('accepts each field alone, since an update is a patch', () => {
    expect(improvementUpdateSchema.safeParse({ title: 'Dark mode' }).success).toBe(true);
    expect(improvementUpdateSchema.safeParse({ status: 'shipped' }).success).toBe(true);
    expect(improvementUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('still applies the same rules to whichever field is present', () => {
    expect(improvementUpdateSchema.safeParse({ title: '  ' }).success).toBe(false);
    expect(improvementUpdateSchema.safeParse({ status: 'wontfix' }).success).toBe(false);
  });
});

describe('improvementIdParamSchema', () => {
  it('accepts a uuid and refuses anything else', () => {
    expect(improvementIdParamSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(improvementIdParamSchema.safeParse({ id: 'improvement-1' }).success).toBe(false);
  });
});

describe('improvementVoteTable', () => {
  it('is keyed on the improvement and the member, so a member votes once', () => {
    const config = getTableConfig(improvementVoteTable);
    expect(config.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      'improvement_id',
      'member_id',
    ]);
  });
});
