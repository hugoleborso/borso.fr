import { describe, expect, it } from 'vitest';
import {
  ALL_TASK_IDS,
  BOTTOM_THIRD_FROM,
  buildDelaySequence,
  countFullTextRuns,
  describeTaskCounts,
  type FoundTarget,
  isInBottomThird,
  isSameBox,
  isSceneRoute,
  listDistinctFontSizes,
  listBaselineDifferences,
  listRequestedTaskIds,
  countTextsWithDigits,
  parseTaskMetricsArguments,
  selectLongestTitle,
  planScrollGesture,
  projectScreenFraction,
  projectTapPoint,
  replaceIdentifierInPath,
  replaceIdentifiers,
  sumCounts,
  sumSchemeCounts,
  summariseRouteButtons,
} from './task-metrics.core';

const EXPECTED_FIRST_DELAYS = [627, 3, 527, 981];
const SAMPLE_IDENTIFIER = '0f8fad5b-d9cb-469f-a165-70867728950e';

function buildTarget(overrides: Partial<FoundTarget> = {}): FoundTarget {
  return {
    centreX: 195,
    centreY: 422,
    viewportWidth: 390,
    viewportHeight: 844,
    screenTop: 0,
    screenLeft: 0,
    screenWidth: 390,
    screenHeight: 844,
    visibleTop: 0,
    visibleBottom: 844,
    hittable: true,
    inView: true,
    container: null,
    ...overrides,
  };
}

describe('listRequestedTaskIds', () => {
  it('answers every task, 8b included, for all and for no value', () => {
    expect(listRequestedTaskIds('all')).toEqual(ALL_TASK_IDS);
    expect(listRequestedTaskIds(null)).toEqual(ALL_TASK_IDS);
    expect(ALL_TASK_IDS).toContain('8b');
  });

  it('answers nothing for none and splits a list on commas', () => {
    expect(listRequestedTaskIds('none')).toEqual([]);
    expect(listRequestedTaskIds('5,6,,8b')).toEqual(['5', '6', '8b']);
  });
});

describe('parseTaskMetricsArguments', () => {
  it('reads every option', () => {
    expect(
      parseTaskMetricsArguments([
        '--tasks',
        '5',
        '--routes',
        '--slice-1',
        '--slice-2',
        '--slice-3',
        '--slice-4',
        '--seed',
        'no-upcoming-session',
        '--out',
        'after.json',
        '--compare',
        'baseline.json',
      ]),
    ).toEqual({
      taskIds: ['5'],
      measureRoutes: true,
      measureSliceOne: true,
      measureSliceTwo: true,
      measureSliceThree: true,
      measureSliceFour: true,
      seedVariant: 'no-upcoming-session',
      outputPath: 'after.json',
      baselinePath: 'baseline.json',
    });
  });

  it('defaults to every task, no routes and no files', () => {
    expect(parseTaskMetricsArguments(['--out'])).toEqual({
      taskIds: ALL_TASK_IDS,
      measureRoutes: false,
      measureSliceOne: false,
      measureSliceTwo: false,
      measureSliceThree: false,
      measureSliceFour: false,
      seedVariant: 'audit',
      outputPath: null,
      baselinePath: null,
    });
  });

  it('refuses a seed it does not know', () => {
    expect(() => parseTaskMetricsArguments(['--seed', 'empty'])).toThrow(
      new Error('unknown seed empty; expected one of audit, no-upcoming-session'),
    );
  });
});

describe('countTextsWithDigits', () => {
  it('counts the labels that carry a number', () => {
    expect(countTextsWithDigits(['Home', 'Songs 12', '3', 'Band'])).toBe(2);
  });
});

describe('selectLongestTitle', () => {
  it('picks the song with the longest title, the first one on a tie', () => {
    const songs = [
      { id: 'a', title: 'Kiss' },
      { id: 'b', title: 'Superstition' },
      { id: 'c', title: 'Seven Nation' },
    ];
    expect(selectLongestTitle(songs)?.id).toBe('b');
    expect(selectLongestTitle([])).toBeNull();
  });
});

describe('projectTapPoint', () => {
  it('maps the centre to fractions of the layout viewport, from the visual viewport origin', () => {
    expect(
      projectTapPoint(buildTarget({ centreX: 100, centreY: 300, screenLeft: 10, screenTop: 20 })),
    ).toEqual({ x: 90 / 390, y: 280 / 844 });
  });
});

describe('projectScreenFraction and isInBottomThird', () => {
  it('rounds the fraction to three decimals', () => {
    expect(projectScreenFraction(buildTarget({ centreY: 100 }))).toBe(0.118);
  });

  it('places a control at two thirds or lower in the bottom third', () => {
    expect(isInBottomThird(buildTarget({ centreY: 844 * BOTTOM_THIRD_FROM }))).toBe(true);
    expect(isInBottomThird(buildTarget({ centreY: 844 * BOTTOM_THIRD_FROM - 1 }))).toBe(false);
  });

  it('measures from the top of the visual viewport', () => {
    const target = buildTarget({ centreY: 600, screenTop: 100 });
    expect(projectScreenFraction(target)).toBe(0.592);
    expect(isInBottomThird(target)).toBe(false);
  });

  it('never counts a control that is not in view', () => {
    expect(isInBottomThird(buildTarget({ centreY: 800, inView: false }))).toBe(false);
  });
});

describe('planScrollGesture', () => {
  it('scrolls the page from its middle by the distance to the visible middle', () => {
    const plan = planScrollGesture(buildTarget({ centreY: 844 * 0.9, inView: false }));
    expect(plan.point).toEqual({ x: 0.5, y: 0.45 });
    expect(plan.deltaY).toBeCloseTo(0.4);
  });

  it('caps one gesture at seventy percent of the screen in both directions', () => {
    expect(planScrollGesture(buildTarget({ centreY: 5000 })).deltaY).toBe(0.7);
    expect(planScrollGesture(buildTarget({ centreY: -5000 })).deltaY).toBe(-0.7);
  });

  it('nudges a covered control that already sits at the visible middle', () => {
    expect(planScrollGesture(buildTarget({ hittable: false })).deltaY).toBe(0.15);
    expect(planScrollGesture(buildTarget({ hittable: true })).deltaY).toBe(0);
  });

  it('scrolls a container from its own centre line', () => {
    const plan = planScrollGesture(
      buildTarget({
        container: { rect: [10, 100, 200, 400] },
        visibleTop: 100,
        visibleBottom: 500,
      }),
    );
    expect(plan.point).toEqual({ x: 110 / 390, y: 300 / 844 });
  });

  it('places the container point from the visual viewport origin', () => {
    const plan = planScrollGesture(
      buildTarget({
        container: { rect: [10, 100, 200, 400] },
        visibleTop: 100,
        visibleBottom: 500,
        screenLeft: 5,
        screenTop: 20,
      }),
    );
    expect(plan.point).toEqual({ x: 105 / 390, y: 280 / 844 });
  });

  it('nudges only a covered control closer than five percent of the screen', () => {
    const tall = { screenHeight: 1000, visibleTop: 0, visibleBottom: 1000, hittable: false };
    expect(planScrollGesture(buildTarget({ ...tall, centreY: 800 })).deltaY).toBeCloseTo(0.3);
    expect(planScrollGesture(buildTarget({ ...tall, centreY: 550 })).deltaY).toBe(0.05);
    expect(planScrollGesture(buildTarget({ ...tall, centreY: 549 })).deltaY).toBe(0.15);
  });

  it('reads a short container box as zero', () => {
    expect(planScrollGesture(buildTarget({ container: { rect: [] } })).point.x).toBe(0);
  });
});

describe('replaceIdentifiers', () => {
  it('replaces every identifier in a nested value and in a path', () => {
    expect(replaceIdentifiers({ path: `/setlists/${SAMPLE_IDENTIFIER}` })).toEqual({
      path: '/setlists/:id',
    });
    expect(replaceIdentifierInPath(`/a/${SAMPLE_IDENTIFIER}/b/${SAMPLE_IDENTIFIER}`)).toBe(
      '/a/:id/b/:id',
    );
  });
});

describe('listBaselineDifferences', () => {
  const baseline = {
    tasks: { '5': { taps: 3, textEntries: 1, scrollGestures: 0, screensVisited: 2 } },
  };

  it('answers nothing when every compared field matches', () => {
    expect(listBaselineDifferences(baseline, baseline, ['5'])).toEqual([]);
  });

  it('names each differing field with both values', () => {
    const current = {
      tasks: { '5': { taps: 4, textEntries: 1, scrollGestures: 1, screensVisited: 2 } },
    };
    expect(listBaselineDifferences(current, baseline, ['5'])).toEqual([
      'task 5: taps 4 (baseline 3)',
      'task 5: scrollGestures 1 (baseline 0)',
    ]);
  });

  it('reports a failed, a missing and an unknown task', () => {
    expect(
      listBaselineDifferences({ tasks: { '5': { failed: 'not found: Save' } } }, baseline, ['5']),
    ).toEqual(['task 5: failed (not found: Save)']);
    expect(listBaselineDifferences({ tasks: [] }, baseline, ['5'])).toEqual([
      'task 5: failed (not measured)',
    ]);
    expect(listBaselineDifferences(null, baseline, ['9'])).toEqual(['task 9: not in the baseline']);
  });
});

describe('describeTaskCounts', () => {
  it('lists the compared fields of a summary', () => {
    expect(
      describeTaskCounts({ taps: 3, textEntries: 1, scrollGestures: 0, screensVisited: 2 }),
    ).toBe('taps=3 textEntries=1 scrollGestures=0 screensVisited=2');
    expect(describeTaskCounts('nothing')).toBe('no summary');
  });
});

describe('buildDelaySequence', () => {
  it('answers the same delays for the same seed, each within the maximum', () => {
    const first = buildDelaySequence(7, 23, 700);
    expect(first).toEqual(buildDelaySequence(7, 23, 700));
    expect(first).toHaveLength(23);
    expect(first.every((delay) => delay >= 0 && delay <= 700)).toBe(true);
    expect(new Set(first).size).toBeGreaterThan(10);
    expect(buildDelaySequence(8, 23, 700)).not.toEqual(first);
    expect(buildDelaySequence(1, 4, 1000)).toEqual(EXPECTED_FIRST_DELAYS);
  });
});

describe('listDistinctFontSizes', () => {
  it('collects the sizes of every route but the scene views, smallest first', () => {
    expect(
      listDistinctFontSizes([
        { route: '/catalog', fontSizes: ['16px', '12px'] },
        { route: '/setlists/:setlistId', fontSizes: ['12px', '22px'] },
        { route: '/catalog/:songId/scene', fontSizes: ['48px'] },
      ]),
    ).toEqual(['12px', '16px', '22px']);
  });

  it('recognises a scene route by its last segment', () => {
    expect(isSceneRoute('/setlists/:setlistId/scene')).toBe(true);
    expect(isSceneRoute('/setlists/:setlistId')).toBe(false);
  });
});

describe('countFullTextRuns', () => {
  it('counts the runs where the server holds what the field shows', () => {
    expect(
      countFullTextRuns([
        { stored: 'Finir', shown: 'Finir' },
        { stored: 'Refrain', shown: 'Refrain' },
        { stored: 'Fin', shown: 'Finir' },
        { stored: null, shown: 'Finir' },
        { stored: null, shown: null },
      ]),
    ).toBe(2);
  });
});

describe('sumCounts', () => {
  it('adds the counts', () => {
    expect(sumCounts([1, 2, 3])).toBe(6);
    expect(sumCounts([])).toBe(0);
  });
});

describe('summariseRouteButtons', () => {
  it('adds the button counts of every measured route', () => {
    expect(
      summariseRouteButtons({
        routes: [
          { buttons: { total: 10, textNoIcon: 4 }, iconOnlyButtonsWithoutName: 1 },
          { buttons: { total: 2, textNoIcon: 0 } },
          { buttons: {} },
          { route: '/broken' },
          'not a route',
        ],
      }),
    ).toEqual({ routes: 3, buttons: 12, textOnlyButtons: 4, iconOnlyButtonsWithoutName: 1 });
  });

  it('answers zero for anything that is not a route measure', () => {
    expect(summariseRouteButtons(null)).toEqual({
      routes: 0,
      buttons: 0,
      textOnlyButtons: 0,
      iconOnlyButtonsWithoutName: 0,
    });
  });
});

describe('isSameBox', () => {
  it('holds for two boxes with the same edges', () => {
    expect(isSameBox([123, 90, 251, 44], [123, 90, 251, 44])).toBe(true);
  });

  it('fails when the box moved', () => {
    expect(isSameBox([123, 16, 251, 44], [123, 90, 251, 44])).toBe(false);
  });

  it('fails when one box has fewer edges', () => {
    expect(isSameBox([123, 16, 251], [123, 16, 251, 44])).toBe(false);
  });
});

describe('sumSchemeCounts', () => {
  it('sums each scheme apart and both together', () => {
    expect(
      sumSchemeCounts([
        { light: { count: 0 }, dark: { count: 1 } },
        { light: { count: 2 }, dark: { count: 3 } },
      ]),
    ).toEqual({ light: 2, dark: 4, total: 6 });
  });
});
