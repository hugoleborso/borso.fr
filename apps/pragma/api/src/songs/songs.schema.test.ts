import {
  CHORDPRO_TEXT_MAX_LENGTH,
  SONG_CHART_LABEL_MAX_LENGTH,
  SONG_CHARTS_MAX,
  SONG_CHARTS_MAX_ENCODED_BYTES,
} from '@domain/input-limits.core';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  chordChartSchema,
  defaultLineupSchema,
  externalSearchQuerySchema,
  legacyChordChartSchema,
  songChordChartsSchema,
  songCreateInputSchema,
  songExternalLinkSchema,
  songIdParamSchema,
  songIsrcsRowSchema,
  songLinksRowSchema,
  songTable,
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

function chart(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'chordpro', text: '[C]Like the', instrumentIds: [], label: null, ...overrides };
}

describe('legacyChordChartSchema', () => {
  it('accepts each of the three kinds in its own shape', () => {
    expect(
      legacyChordChartSchema.safeParse({ kind: 'chordpro', text: '[C]Like the' }).success,
    ).toBe(true);
    expect(legacyChordChartSchema.safeParse({ kind: 'pdf', s3Key: 'charts/a.pdf' }).success).toBe(
      true,
    );
    expect(legacyChordChartSchema.safeParse({ kind: 'image', s3Key: 'charts/a.png' }).success).toBe(
      true,
    );
  });
});

describe('chordChartSchema', () => {
  it('accepts each of the three kinds in its own shape', () => {
    expect(chordChartSchema.safeParse(chart()).success).toBe(true);
    expect(
      chordChartSchema.safeParse(chart({ kind: 'pdf', text: undefined, s3Key: 'charts/a.pdf' }))
        .success,
    ).toBe(true);
    expect(
      chordChartSchema.safeParse(chart({ kind: 'image', text: undefined, s3Key: 'charts/a.png' }))
        .success,
    ).toBe(true);
  });

  it('refuses a kind carrying the other kind field', () => {
    expect(chordChartSchema.safeParse(chart({ kind: 'pdf' })).success).toBe(false);
    expect(
      chordChartSchema.safeParse(chart({ text: undefined, s3Key: 'charts/a.pdf' })).success,
    ).toBe(false);
  });

  it('refuses an empty chart of any kind', () => {
    expect(chordChartSchema.safeParse(chart({ text: '' })).success).toBe(false);
    expect(
      chordChartSchema.safeParse(chart({ kind: 'pdf', text: undefined, s3Key: '' })).success,
    ).toBe(false);
  });

  it('names each instrument once, and refuses an id that is not a UUID', () => {
    const chartNamingOneInstrument = chordChartSchema.parse(
      chart({ instrumentIds: [instrumentId, instrumentId] }),
    );
    expect(chartNamingOneInstrument.instrumentIds).toEqual([instrumentId]);
    expect(chordChartSchema.safeParse(chart({ instrumentIds: ['guitar'] })).success).toBe(false);
  });

  it('trims the label, stores a blank one as null and refuses one too long', () => {
    expect(chordChartSchema.parse(chart({ label: '  Solo  ' })).label).toBe('Solo');
    expect(chordChartSchema.parse(chart({ label: '  ' })).label).toBeNull();
    expect(
      chordChartSchema.safeParse(chart({ label: 'x'.repeat(SONG_CHART_LABEL_MAX_LENGTH + 1) }))
        .success,
    ).toBe(false);
  });
});

describe('songChordChartsSchema', () => {
  it('holds up to six charts and refuses a seventh', () => {
    expect(
      songChordChartsSchema.safeParse(Array.from({ length: SONG_CHARTS_MAX }, () => chart()))
        .success,
    ).toBe(true);
    expect(
      songChordChartsSchema.safeParse(Array.from({ length: SONG_CHARTS_MAX + 1 }, () => chart()))
        .success,
    ).toBe(false);
  });

  it('refuses a list whose encoded JSON is over the byte budget', () => {
    const threeByteText = '€'.repeat(CHORDPRO_TEXT_MAX_LENGTH);
    const fullCharts = Array.from({ length: SONG_CHARTS_MAX }, () =>
      chart({ text: threeByteText }),
    );
    expect(JSON.stringify(fullCharts).length).toBeLessThan(SONG_CHARTS_MAX_ENCODED_BYTES);
    expect(songChordChartsSchema.safeParse(fullCharts).success).toBe(false);
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
      charts: [],
      baseEnergy: null,
      deezerTrackId: null,
      album: null,
      durationSeconds: null,
    });
  });

  it('trims the title and refuses whitespace alone', () => {
    expect(songCreateInputSchema.parse(song({ title: '  Get Lucky  ' })).title).toBe('Get Lucky');
    expect(songCreateInputSchema.safeParse(song({ title: '   ' })).success).toBe(false);
  });

  it('accepts every status in the rehearsal pipeline and nothing else', () => {
    for (const status of ['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready']) {
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
  it('leaves out every field the patch does not name, defaults included', () => {
    expect(songUpdateInputSchema.parse({ title: 'Creep' })).toEqual({ title: 'Creep' });
  });

  it('leaves the charts out of a patch that carries only the lineup', () => {
    expect(songUpdateInputSchema.parse({ defaultLineup: {} })).not.toHaveProperty('charts');
  });

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

describe('songTable', () => {
  it('holds one song per Deezer track with a unique index on the track id', () => {
    const [trackIndex] = getTableConfig(songTable).indexes;
    expect(trackIndex?.config.name).toBe('song_deezer_track_id_unique');
    expect(trackIndex?.config.unique).toBe(true);
    expect(
      trackIndex?.config.columns.map((column) => ('name' in column ? column.name : '')),
    ).toEqual(['deezer_track_id']);
  });
});
