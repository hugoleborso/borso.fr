import { describe, expect, it } from 'vitest';
import {
  clusterBySharedWord,
  describeDuration,
  domainWordsOf,
  highestCacheFanOut,
  listCacheFanOutConnascence,
  listCacheFreshnessConnascence,
  listExecutionConnascence,
  listOrphanCacheKeys,
  listTimingConnascence,
} from './timing-kinds.core';
import {
  BARS_SERVICE,
  CATALOG_PAGE,
  INDEX,
  RANKING_CONTROLLER,
  SONGS_CONTROLLER,
  SONGS_SERVICE,
  STANDINGS_QUERIES,
  TIMING_INDEX,
} from './connascence.fixtures';
import type { CacheTouchSite } from './connascence.types';

describe('listExecutionConnascence', () => {
  it('reports module state one export writes and another reads', () => {
    const findings = listExecutionConnascence(
      [
        {
          path: SONGS_SERVICE.path,
          name: 'cachedClient',
          writers: ['connect'],
          readers: ['query'],
          line: 3,
        },
        {
          path: BARS_SERVICE.path,
          name: 'unread',
          writers: ['connect'],
          readers: [],
          line: 4,
        },
      ],
      INDEX,
    );
    expect(findings).toStrictEqual([
      {
        kind: 'execution',
        subject: `cachedClient in ${SONGS_SERVICE.path}`,
        degree: 2,
        locality: 0,
        score: 6,
        occurrences: [
          { path: SONGS_SERVICE.path, line: 3, detail: 'connect' },
          { path: SONGS_SERVICE.path, line: 3, detail: 'query' },
        ],
      },
    ]);
  });

  it('skips state nothing writes', () => {
    expect(
      listExecutionConnascence(
        [
          {
            path: SONGS_SERVICE.path,
            name: 'neverWritten',
            writers: [],
            readers: ['query'],
            line: 3,
          },
        ],
        INDEX,
      ),
    ).toStrictEqual([]);
  });
});

describe('describeDuration', () => {
  it('names each scale it crosses', () => {
    expect(describeDuration(80)).toBe('80 ms');
    expect(describeDuration(2000)).toBe('2 s');
    expect(describeDuration(300_000)).toBe('5 min');
    expect(describeDuration(43_200_000)).toBe('12 h');
  });

  it('switches scale exactly on the boundary', () => {
    expect(describeDuration(999)).toBe('999 ms');
    expect(describeDuration(1000)).toBe('1 s');
    expect(describeDuration(59_000)).toBe('59 s');
    expect(describeDuration(60_000)).toBe('1 min');
    expect(describeDuration(3_540_000)).toBe('59 min');
    expect(describeDuration(3_600_000)).toBe('1 h');
  });
});

describe('domainWordsOf', () => {
  it('splits on underscores and case, and drops units and generic words', () => {
    expect([...domainWordsOf('SESSION_TTL_HOURS = 12')]).toStrictEqual(['SESSION', 'TTL']);
    expect([...domainWordsOf('MAXIMUM_INTERVAL_MINUTES = 240')]).toStrictEqual(['INTERVAL']);
    expect([...domainWordsOf('staleTime: 5')]).toStrictEqual(['STALE']);
    expect([...domainWordsOf('MAX')]).toStrictEqual([]);
  });
});

describe('clusterBySharedWord', () => {
  it('joins items transitively, keeps the words it absorbed, and leaves an unrelated item alone', () => {
    const clusters = clusterBySharedWord(
      ['alpha beta', 'beta gamma', 'gamma delta', 'lonely', 'alpha omega'],
      (item) => new Set(item.split(' ').map((word) => word.toUpperCase())),
    );
    expect(clusters).toStrictEqual([
      ['lonely'],
      ['alpha beta', 'beta gamma', 'gamma delta', 'alpha omega'],
    ]);
  });
});

describe('listTimingConnascence', () => {
  it('reports a duration two files agree on and drops a coincidence', () => {
    const findings = listTimingConnascence(
      [
        {
          path: SONGS_CONTROLLER.path,
          line: 16,
          milliseconds: 43_200_000,
          expression: 'ADMIN_COOKIE_TTL_HOURS = 12',
        },
        {
          path: SONGS_SERVICE.path,
          line: 28,
          milliseconds: 43_200_000,
          expression: 'SESSION_TTL_HOURS = 12',
        },
        {
          path: BARS_SERVICE.path,
          line: 3,
          milliseconds: 43_200_000,
          expression: 'CHART_RENDER_BUDGET_HOURS = 12',
        },
      ],
      TIMING_INDEX,
    );
    expect(findings).toStrictEqual([
      {
        kind: 'timing',
        subject: '12 h',
        degree: 2,
        locality: 1,
        score: 14,
        occurrences: [
          { path: SONGS_CONTROLLER.path, line: 16, detail: 'ADMIN_COOKIE_TTL_HOURS = 12' },
          { path: SONGS_SERVICE.path, line: 28, detail: 'SESSION_TTL_HOURS = 12' },
        ],
      },
    ]);
  });

  it('drops a cluster that lives in one file', () => {
    expect(
      listTimingConnascence(
        [
          { path: SONGS_SERVICE.path, line: 1, milliseconds: 200, expression: 'FADE_MS = 200' },
          { path: SONGS_SERVICE.path, line: 2, milliseconds: 200, expression: 'FADE_OUT_MS = 200' },
        ],
        TIMING_INDEX,
      ),
    ).toStrictEqual([]);
  });
});

describe('listCacheFreshnessConnascence', () => {
  it('pairs a server directive with a client refetch', () => {
    const findings = listCacheFreshnessConnascence(
      [
        {
          path: RANKING_CONTROLLER.path,
          line: 15,
          milliseconds: 2000,
          expression: 'max-age=2',
        },
      ],
      [
        {
          path: STANDINGS_QUERIES.path,
          line: 4,
          milliseconds: 2000,
          expression: 'POLL_INTERVAL_MS = 2000',
        },
      ],
      TIMING_INDEX,
    );
    expect(findings).toStrictEqual([
      {
        kind: 'cache',
        subject: 'server freshness and client refetch must be chosen together',
        degree: 2,
        locality: 3,
        score: 56,
        occurrences: [
          { path: RANKING_CONTROLLER.path, line: 15, detail: 'max-age=2 — 2 s' },
          {
            path: STANDINGS_QUERIES.path,
            line: 4,
            detail: 'POLL_INTERVAL_MS = 2000 — 2 s',
          },
        ],
      },
    ]);
  });

  it('reports nothing when either side is absent', () => {
    const server = [
      { path: RANKING_CONTROLLER.path, line: 15, milliseconds: 2000, expression: 'max-age=2' },
    ];
    expect(listCacheFreshnessConnascence(server, [], TIMING_INDEX)).toStrictEqual([]);
    expect(listCacheFreshnessConnascence([], server, TIMING_INDEX)).toStrictEqual([]);
  });
});

const SONGS_TOUCH: CacheTouchSite = {
  path: CATALOG_PAGE.path,
  line: 40,
  owner: 'useUpdateSong',
  root: 'songKeys',
  method: 'setQueryData',
};

const SETLIST_TOUCH: CacheTouchSite = {
  path: CATALOG_PAGE.path,
  line: 42,
  owner: 'useUpdateSong',
  root: 'setlistKeys',
  method: 'invalidateQueries',
};

const LONE_TOUCH: CacheTouchSite = {
  path: BARS_SERVICE.path,
  line: 7,
  owner: 'useCreateBar',
  root: 'barKeys',
  method: 'invalidateQueries',
};

describe('listCacheFanOutConnascence', () => {
  it('reports an owner touching more than one cache and skips one touching a single cache', () => {
    const findings = listCacheFanOutConnascence(
      [SONGS_TOUCH, SETLIST_TOUCH, LONE_TOUCH],
      INDEX,
      new Map([
        ['songKeys', SONGS_SERVICE.path],
        ['setlistKeys', BARS_SERVICE.path],
      ]),
    );
    expect(findings).toStrictEqual([
      {
        kind: 'cache',
        subject: 'useUpdateSong touches 2 caches',
        degree: 2,
        locality: 3,
        score: 56,
        occurrences: [
          {
            path: CATALOG_PAGE.path,
            line: 40,
            detail: `${CATALOG_PAGE.path}#useUpdateSong`,
          },
          { path: BARS_SERVICE.path, line: 0, detail: 'setlistKeys' },
          { path: SONGS_SERVICE.path, line: 0, detail: 'songKeys' },
        ],
      },
    ]);
  });

  it('falls back to the touching file when the key was declared nowhere it could see', () => {
    const findings = listCacheFanOutConnascence([SONGS_TOUCH, SETLIST_TOUCH], INDEX, new Map());
    expect(findings[0]?.occurrences.map((each) => each.path)).toStrictEqual([
      CATALOG_PAGE.path,
      CATALOG_PAGE.path,
      CATALOG_PAGE.path,
    ]);
  });
});

describe('listOrphanCacheKeys and highestCacheFanOut', () => {
  it('names a cache write whose key no query reads', () => {
    expect(
      listOrphanCacheKeys(
        [SONGS_TOUCH, LONE_TOUCH],
        [{ path: CATALOG_PAGE.path, root: 'songKeys' }],
      ),
    ).toStrictEqual([
      { root: 'barKeys', path: BARS_SERVICE.path, line: 7, method: 'invalidateQueries' },
    ]);
  });

  it('reports the widest fan-out any one owner reaches', () => {
    expect(highestCacheFanOut([SONGS_TOUCH, SETLIST_TOUCH, LONE_TOUCH])).toBe(2);
    expect(highestCacheFanOut([])).toBe(0);
  });
});
