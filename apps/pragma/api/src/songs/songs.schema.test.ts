import { describe, expect, it } from 'vitest';
import {
  chordChartSchema,
  defaultLineupSchema,
  externalSearchQuerySchema,
  songCreateInputSchema,
  songExternalLinkSchema,
  songIdParamSchema,
  songIsrcsRowSchema,
  songLinksRowSchema,
  songTagsRowSchema,
  songUpdateInputSchema,
} from './songs.schema';

const MAXIMUM_ISRCS = 8;
const MAXIMUM_TAGS = 16;
const MAXIMUM_LINKS = 16;
const SECONDS_IN_A_DAY = 24 * 60 * 60;
const memberId = crypto.randomUUID();
const instrumentId = crypto.randomUUID();

function song(overrides: Record<string, unknown> = {}): unknown {
  return { title: 'Get Lucky', status: 'idea', ...overrides };
}

function link(overrides: Record<string, unknown> = {}): unknown {
  return { url: 'https://open.spotify.com/track/1', provider: 'spotify', ...overrides };
}

describe('songExternalLinkSchema', () => {
  it('needs a real URL and a provider it knows', () => {
    expect(songExternalLinkSchema.safeParse(link()).success).toBe(true);
    expect(songExternalLinkSchema.safeParse(link({ url: 'open.spotify.com' })).success).toBe(false);
    expect(songExternalLinkSchema.safeParse(link({ provider: 'bandcamp' })).success).toBe(false);
  });

  it('defaults the comment to empty', () => {
    expect(songExternalLinkSchema.parse(link()).comment).toBe('');
  });
});

describe('chordChartSchema', () => {
  it('accepts each of the three kinds in its own shape', () => {
    expect(chordChartSchema.safeParse({ kind: 'chordpro', text: '[C]Like the' }).success).toBe(
      true,
    );
    expect(chordChartSchema.safeParse({ kind: 'pdf', s3Key: 'charts/a.pdf' }).success).toBe(true);
    expect(chordChartSchema.safeParse({ kind: 'image', s3Key: 'charts/a.png' }).success).toBe(true);
  });

  it('refuses a kind carrying the other kind field', () => {
    expect(chordChartSchema.safeParse({ kind: 'pdf', text: '[C]Like the' }).success).toBe(false);
    expect(chordChartSchema.safeParse({ kind: 'chordpro', s3Key: 'charts/a.pdf' }).success).toBe(
      false,
    );
  });

  it('refuses an empty chart of any kind', () => {
    expect(chordChartSchema.safeParse({ kind: 'chordpro', text: '' }).success).toBe(false);
    expect(chordChartSchema.safeParse({ kind: 'pdf', s3Key: '' }).success).toBe(false);
  });
});

describe('defaultLineupSchema', () => {
  it('lifts the two older stored shapes into lists', () => {
    const single = defaultLineupSchema.safeParse({ [memberId]: instrumentId });
    expect(single.success && single.data[memberId]).toEqual([instrumentId]);
    const sittingOut = defaultLineupSchema.safeParse({ [memberId]: null });
    expect(sittingOut.success && sittingOut.data[memberId]).toEqual([]);
  });
});

describe('songCreateInputSchema', () => {
  it('needs a title and a status, and fills every other field in', () => {
    expect(songCreateInputSchema.parse(song())).toMatchObject({
      artist: '',
      links: [],
      isrcs: [],
      tags: [],
      baseEnergy: null,
      mbid: null,
      album: null,
      durationSeconds: null,
    });
  });

  it('trims the title and refuses whitespace alone', () => {
    expect(songCreateInputSchema.parse(song({ title: '  Get Lucky  ' })).title).toBe('Get Lucky');
    expect(songCreateInputSchema.safeParse(song({ title: '   ' })).success).toBe(false);
  });

  it('accepts every status in the rehearsal pipeline and nothing else', () => {
    for (const status of ['idea', 'wip', 'rehearsed', 'concert_ready']) {
      expect(songCreateInputSchema.safeParse(song({ status })).success).toBe(true);
    }
    expect(songCreateInputSchema.safeParse(song({ status: 'retired' })).success).toBe(false);
  });

  it('caps the lists so one song cannot carry an unbounded blob', () => {
    expect(
      songCreateInputSchema.safeParse(
        song({ links: Array.from({ length: MAXIMUM_LINKS + 1 }, link) }),
      ).success,
    ).toBe(false);
    expect(
      songCreateInputSchema.safeParse(
        song({ isrcs: Array.from({ length: MAXIMUM_ISRCS + 1 }, () => 'x') }),
      ).success,
    ).toBe(false);
    expect(
      songCreateInputSchema.safeParse(
        song({ tags: Array.from({ length: MAXIMUM_TAGS + 1 }, () => 'x') }),
      ).success,
    ).toBe(false);
  });

  it('refuses a duration longer than a day or shorter than nothing', () => {
    expect(songCreateInputSchema.safeParse(song({ durationSeconds: -1 })).success).toBe(false);
    expect(
      songCreateInputSchema.safeParse(song({ durationSeconds: SECONDS_IN_A_DAY + 1 })).success,
    ).toBe(false);
    expect(songCreateInputSchema.safeParse(song({ durationSeconds: 0 })).success).toBe(true);
  });
});

describe('songUpdateInputSchema', () => {
  it('accepts a patch with nothing in it, and still checks what is there', () => {
    expect(songUpdateInputSchema.safeParse({}).success).toBe(true);
    expect(songUpdateInputSchema.safeParse({ status: 'retired' }).success).toBe(false);
  });
});

describe('the row-side schemas', () => {
  it('validate the JSON blobs the text columns hold', () => {
    expect(songLinksRowSchema.safeParse([link()]).success).toBe(true);
    expect(songIsrcsRowSchema.safeParse(['FR-Z03-14-00123']).success).toBe(true);
    expect(songTagsRowSchema.safeParse(['funk']).success).toBe(true);
    expect(songLinksRowSchema.safeParse([{ url: 'nope' }]).success).toBe(false);
  });
});

describe('externalSearchQuerySchema', () => {
  it('needs something to search for', () => {
    expect(externalSearchQuerySchema.safeParse({ q: 'get lucky' }).success).toBe(true);
    expect(externalSearchQuerySchema.safeParse({ q: '' }).success).toBe(false);
  });
});

describe('songIdParamSchema', () => {
  it('accepts a uuid and refuses anything else', () => {
    expect(songIdParamSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(songIdParamSchema.safeParse({ id: 'song-1' }).success).toBe(false);
  });
});
