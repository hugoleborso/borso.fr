import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  audienceSearchQuerySchema,
  audienceSuggestionTable,
  audienceVoteTable,
  concertParamSchema,
  roundParamSchema,
  roundVoteParamSchema,
  suggestionCreateSchema,
  voteCreateSchema,
  votingRoundTable,
} from './audience.schema';

const SOME_UUID = '11111111-1111-4111-8111-111111111111';
const OTHER_UUID = '22222222-2222-4222-8222-222222222222';
const MUSICBRAINZ_ID_MAX = 256;
const SEARCH_QUERY_MAX = 256;

// @FollowsBlueprint test-pure-unit
describe('the audience tables', () => {
  it('carry no setlist identifier, because a round anchors on the concert', () => {
    const columnNames = [
      ...Object.keys(votingRoundTable),
      ...Object.keys(audienceVoteTable),
      ...Object.keys(audienceSuggestionTable),
    ];
    expect(columnNames.filter((name) => name.toLowerCase().includes('setlist'))).toEqual([]);
  });

  it('carry no stored counter, because the tally is computed from the rows on every read', () => {
    const columnNames = Object.keys(audienceVoteTable);
    expect(columnNames.filter((name) => name.toLowerCase().includes('count'))).toEqual([]);
  });

  it('identify a vote by the round, the ballot and the song, so one ballot votes once per song', () => {
    const [primary] = getTableConfig(audienceVoteTable).primaryKeys;
    expect(primary?.columns.map((column) => column.name)).toEqual([
      'round_id',
      'ballot_token',
      'song_id',
    ]);
  });
});

describe('voteCreateSchema', () => {
  it('accepts a song identifier on its own', () => {
    expect(voteCreateSchema.safeParse({ songId: SOME_UUID }).success).toBe(true);
  });

  it('refuses a body carrying anything the vote does not decide', () => {
    expect(voteCreateSchema.safeParse({ songId: SOME_UUID, voteCount: 9 }).success).toBe(false);
  });

  it('refuses a song identifier that is not a uuid', () => {
    expect(voteCreateSchema.safeParse({ songId: 'the-one-with-the-riff' }).success).toBe(false);
  });
});

describe('suggestionCreateSchema', () => {
  it('accepts a picked search result named by its MusicBrainz identifier', () => {
    expect(suggestionCreateSchema.safeParse({ mbid: SOME_UUID }).success).toBe(true);
  });

  it('refuses free text arriving beside the picked result', () => {
    const refusal = suggestionCreateSchema.safeParse({ mbid: SOME_UUID, title: 'anything' });
    expect(refusal.success).toBe(false);
  });

  it('refuses an empty identifier and one past the ceiling', () => {
    expect(suggestionCreateSchema.safeParse({ mbid: '' }).success).toBe(false);
    expect(
      suggestionCreateSchema.safeParse({ mbid: 'a'.repeat(MUSICBRAINZ_ID_MAX + 1) }).success,
    ).toBe(false);
  });
});

describe('the parameter schemas', () => {
  it('read a concert identifier', () => {
    expect(concertParamSchema.safeParse({ sessionId: SOME_UUID }).success).toBe(true);
    expect(concertParamSchema.safeParse({ sessionId: 'tonight' }).success).toBe(false);
  });

  it('read a round identifier', () => {
    expect(roundParamSchema.safeParse({ roundId: SOME_UUID }).success).toBe(true);
    expect(roundParamSchema.safeParse({ roundId: 'now' }).success).toBe(false);
  });

  it('read a round and a song together for a retraction', () => {
    expect(roundVoteParamSchema.safeParse({ roundId: SOME_UUID, songId: OTHER_UUID }).success).toBe(
      true,
    );
    expect(roundVoteParamSchema.safeParse({ roundId: SOME_UUID }).success).toBe(false);
  });
});

describe('audienceSearchQuerySchema', () => {
  it('accepts a query at each end of the allowed range', () => {
    expect(audienceSearchQuerySchema.safeParse({ q: 'a' }).success).toBe(true);
    expect(audienceSearchQuerySchema.safeParse({ q: 'a'.repeat(SEARCH_QUERY_MAX) }).success).toBe(
      true,
    );
  });

  it('refuses an empty query and one past the ceiling', () => {
    expect(audienceSearchQuerySchema.safeParse({ q: '' }).success).toBe(false);
    expect(
      audienceSearchQuerySchema.safeParse({ q: 'a'.repeat(SEARCH_QUERY_MAX + 1) }).success,
    ).toBe(false);
  });
});
