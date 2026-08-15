/**
 * A comment lives on an ordered pair, and the pair is two uuids; the comment
 * itself is trimmed, so whitespace is not a comment.
 */

import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  transitionCommentBodySchema,
  transitionCommentTable,
  transitionPairParamSchema,
} from './transitions.schema';

const MAXIMUM_COMMENT_LENGTH = 4_096;

describe('transitionPairParamSchema', () => {
  it('accepts two uuids', () => {
    expect(
      transitionPairParamSchema.safeParse({ a: crypto.randomUUID(), b: crypto.randomUUID() })
        .success,
    ).toBe(true);
  });

  it('refuses a pair where either half is not a uuid', () => {
    expect(
      transitionPairParamSchema.safeParse({ a: 'song-a', b: crypto.randomUUID() }).success,
    ).toBe(false);
    expect(
      transitionPairParamSchema.safeParse({ a: crypto.randomUUID(), b: 'song-b' }).success,
    ).toBe(false);
  });
});

describe('transitionCommentBodySchema', () => {
  it('trims the comment before measuring it', () => {
    expect(transitionCommentBodySchema.parse({ comment: '  hold the ride  ' }).comment).toBe(
      'hold the ride',
    );
  });

  it('refuses whitespace alone, which would read as a comment and say nothing', () => {
    expect(transitionCommentBodySchema.safeParse({ comment: '   ' }).success).toBe(false);
    expect(transitionCommentBodySchema.safeParse({ comment: '' }).success).toBe(false);
  });

  it('refuses a comment past the ceiling and accepts one exactly at it', () => {
    expect(
      transitionCommentBodySchema.safeParse({ comment: 'a'.repeat(MAXIMUM_COMMENT_LENGTH) })
        .success,
    ).toBe(true);
    expect(
      transitionCommentBodySchema.safeParse({ comment: 'a'.repeat(MAXIMUM_COMMENT_LENGTH + 1) })
        .success,
    ).toBe(false);
  });
});

describe('the ordered pair', () => {
  it('is unique, and in the order the spec calls A to B', () => {
    const [ordered] = getTableConfig(transitionCommentTable).indexes;
    expect(ordered?.config.unique).toBe(true);
    expect(ordered?.config.columns.map((column) => ('name' in column ? column.name : ''))).toEqual([
      'song_a_id',
      'song_b_id',
    ]);
  });
});
