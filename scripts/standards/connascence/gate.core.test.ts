import { describe, expect, it } from 'vitest';
import {
  allowanceFor,
  buildMetrics,
  listCeilingFailures,
  listRatchetFailures,
  listRatchetSlack,
} from './gate.core';
import { listPositionConnascence } from './static-kinds.core';
import { listTimingConnascence } from './timing-kinds.core';
import {
  BARS_SERVICE,
  CATALOG_PAGE,
  INDEX,
  SONGS_CONTROLLER,
  SONGS_SERVICE,
} from './connascence.fixtures';
import type { CacheTouchSite } from './connascence.types';

const NO_TOLERANCE = 0;
const TWO_PERCENT = 0.02;

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

describe('buildMetrics and listCeilingFailures', () => {
  const CLONED_LINES = 6;
  const MEASURED_LINES = 1200;

  function measuredMetrics(): ReturnType<typeof buildMetrics> {
    return buildMetrics(
      [
        ...listPositionConnascence(
          [{ path: SONGS_SERVICE.path, name: 'rankSongs', arity: 5, line: 1 }],
          new Map(),
          INDEX,
        ),
        ...listTimingConnascence(
          [
            {
              path: SONGS_CONTROLLER.path,
              line: 1,
              milliseconds: 60_000,
              expression: 'POLL_MS = 1',
            },
            { path: SONGS_SERVICE.path, line: 1, milliseconds: 60_000, expression: 'POLL_MS = 1' },
          ],
          INDEX,
        ),
      ],
      [
        {
          path: SONGS_CONTROLLER.path,
          name: 'slugify',
          digest: 'dddd',
          tokens: 50,
          lines: CLONED_LINES,
          line: 1,
        },
        {
          path: SONGS_SERVICE.path,
          name: 'slugify',
          digest: 'dddd',
          tokens: 50,
          lines: CLONED_LINES,
          line: 1,
        },
        {
          path: CATALOG_PAGE.path,
          name: 'slugify',
          digest: 'dddd',
          tokens: 50,
          lines: CLONED_LINES,
          line: 1,
        },
        {
          path: SONGS_CONTROLLER.path,
          name: 'titleCase',
          digest: 'ffff',
          tokens: 50,
          lines: CLONED_LINES,
          line: 60,
        },
        {
          path: BARS_SERVICE.path,
          name: 'titleCase',
          digest: 'ffff',
          tokens: 50,
          lines: CLONED_LINES,
          line: 60,
        },
        {
          path: BARS_SERVICE.path,
          name: 'inlinedTwice',
          digest: 'eeee',
          tokens: 50,
          lines: CLONED_LINES,
          line: 1,
        },
        {
          path: BARS_SERVICE.path,
          name: 'inlinedTwice',
          digest: 'eeee',
          tokens: 50,
          lines: CLONED_LINES,
          line: 40,
        },
      ],
      [{ root: 'barKeys', path: BARS_SERVICE.path, line: 7, method: 'invalidateQueries' }],
      [SONGS_TOUCH, SETLIST_TOUCH],
      MEASURED_LINES,
    );
  }

  it('counts the redundant copies of a clone, not the original', () => {
    expect(measuredMetrics()).toStrictEqual({
      duplicatedLinePercent: 1.5,
      maximumArity: 5,
      maximumCacheFanOut: 2,
      orphanCacheKeys: 1,
      maximumTimingDegree: 2,
    });
  });

  it('divides by one rather than by zero when nothing was measured', () => {
    expect(buildMetrics([], [], [], [], 0).duplicatedLinePercent).toBe(0);
  });

  it('leaves a metric sitting exactly on its ceiling alone', () => {
    expect(
      listCeilingFailures(measuredMetrics(), {
        maximumArity: { limit: 5, anchor: 'S107 allows 7' },
        orphanCacheKeys: { limit: 1, anchor: 'a defect' },
      }),
    ).toStrictEqual([]);
  });

  it('names every metric past its ceiling in name order, and ignores one with no ceiling', () => {
    expect(
      listCeilingFailures(measuredMetrics(), {
        maximumArity: { limit: 3, anchor: 'S107 allows 7' },
        orphanCacheKeys: { limit: 0, anchor: 'a defect' },
        maximumTimingDegree: { limit: 1, anchor: 'this repository' },
        duplicatedLinePercent: { limit: 1.5, anchor: 'Sonar way allows 3.0' },
      }),
    ).toStrictEqual([
      { metric: 'maximumArity', measured: 5, limit: 3, anchor: 'S107 allows 7' },
      { metric: 'maximumTimingDegree', measured: 2, limit: 1, anchor: 'this repository' },
      { metric: 'orphanCacheKeys', measured: 1, limit: 0, anchor: 'a defect' },
    ]);
  });
});

describe('the ratchet', () => {
  it('fails only the counters that rose beyond their allowance', () => {
    expect(listRatchetFailures({ counter: 100 }, { counter: 103 }, NO_TOLERANCE)).toStrictEqual([
      { key: 'counter', was: 100, now: 103 },
    ]);
    expect(listRatchetFailures({ counter: 100 }, { counter: 102 }, TWO_PERCENT)).toStrictEqual([]);
    expect(listRatchetFailures({ counter: 100 }, { counter: 103 }, TWO_PERCENT)).toStrictEqual([
      { key: 'counter', was: 100, now: 103 },
    ]);
    expect(listRatchetFailures({ counter: 100 }, { counter: 100 }, NO_TOLERANCE)).toStrictEqual([]);
    expect(listRatchetFailures({}, { counter: 1 }, TWO_PERCENT)).toStrictEqual([
      { key: 'counter', was: 0, now: 1 },
    ]);
  });

  it('gives a small counter no room at all', () => {
    expect(allowanceFor(4, TWO_PERCENT)).toBe(0);
    expect(allowanceFor(531, TWO_PERCENT)).toBe(10);
  });
});

describe('listRatchetSlack', () => {
  it('names every counter that fell, and stays quiet about the rest', () => {
    expect(
      listRatchetSlack({ fell: 99, held: 4, rose: 1 }, { fell: 74, held: 4, rose: 2 }),
    ).toStrictEqual([{ key: 'fell', was: 99, now: 74 }]);
  });

  it('treats an absent baseline entry as zero, which nothing can fall below', () => {
    expect(listRatchetSlack({}, { fresh: 3 })).toStrictEqual([]);
  });
});
