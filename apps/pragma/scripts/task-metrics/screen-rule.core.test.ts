import { describe, expect, it } from 'vitest';
import {
  ANY_BACK_LINK,
  listScreenRuleViolations,
  type ScreenShapeReport,
  summariseScreenRule,
} from './screen-rule.core';

const VIEWPORT_HEIGHT = 667;
const WELL_SHAPED: ScreenShapeReport = {
  hasHeader: true,
  headerPosition: 'sticky',
  backLinks: ['/band'],
  headerTopAfterEnd: 0,
  headerBottomAfterEnd: 120,
  viewportHeight: VIEWPORT_HEIGHT,
  contentBelowList: [],
};

describe('listScreenRuleViolations', () => {
  it('accepts a fixed header, on screen at the end, with the expected back link', () => {
    expect(listScreenRuleViolations({ route: '/members', back: '/band' }, WELL_SHAPED)).toEqual([]);
  });

  it('accepts a header with position fixed and no back link expected', () => {
    expect(
      listScreenRuleViolations(
        { route: '/band', back: null },
        { ...WELL_SHAPED, headerPosition: 'fixed', backLinks: [] },
      ),
    ).toEqual([]);
  });

  it('reports a page with no header and nothing else', () => {
    expect(
      listScreenRuleViolations(
        { route: '/x', back: '/band' },
        { ...WELL_SHAPED, hasHeader: false, contentBelowList: [{ list: 'a', below: 'b' }] },
      ),
    ).toEqual(['no page header']);
  });

  it('reports a header that scrolls with the page', () => {
    expect(
      listScreenRuleViolations(
        { route: '/x', back: null },
        { ...WELL_SHAPED, headerPosition: 'static', headerTopAfterEnd: -900 },
      ),
    ).toEqual([
      'header is not fixed (position static)',
      'header scrolled away at the end of the page',
    ]);
  });

  it('allows one pixel at either edge and no more', () => {
    const target = { route: '/x', back: null };
    expect(
      listScreenRuleViolations(target, {
        ...WELL_SHAPED,
        headerTopAfterEnd: -1,
        headerBottomAfterEnd: VIEWPORT_HEIGHT + 1,
      }),
    ).toEqual([]);
    expect(listScreenRuleViolations(target, { ...WELL_SHAPED, headerTopAfterEnd: -1.5 })).toEqual([
      'header scrolled away at the end of the page',
    ]);
    expect(
      listScreenRuleViolations(target, {
        ...WELL_SHAPED,
        headerBottomAfterEnd: VIEWPORT_HEIGHT + 1.5,
      }),
    ).toEqual(['header scrolled away at the end of the page']);
  });

  it('reports a header box that could not be read after scrolling', () => {
    const target = { route: '/x', back: null };
    const scrolledAway = ['header scrolled away at the end of the page'];
    expect(listScreenRuleViolations(target, { ...WELL_SHAPED, headerTopAfterEnd: null })).toEqual(
      scrolledAway,
    );
    expect(
      listScreenRuleViolations(target, { ...WELL_SHAPED, headerBottomAfterEnd: null }),
    ).toEqual(scrolledAway);
  });

  it('reports a missing or wrong back link', () => {
    expect(
      listScreenRuleViolations({ route: '/x', back: '/band' }, { ...WELL_SHAPED, backLinks: [] }),
    ).toEqual(['no back link to /band in the header']);
    expect(
      listScreenRuleViolations(
        { route: '/x', back: ANY_BACK_LINK },
        { ...WELL_SHAPED, backLinks: [] },
      ),
    ).toEqual(['no back link in the header']);
    expect(listScreenRuleViolations({ route: '/x', back: ANY_BACK_LINK }, WELL_SHAPED)).toEqual([]);
  });

  it('reports every piece of content below the list', () => {
    expect(
      listScreenRuleViolations(
        { route: '/x', back: null },
        {
          ...WELL_SHAPED,
          contentBelowList: [
            { list: 'ul "Members"', below: 'form "New member"' },
            { list: 'ul "Members"', below: 'h2 "Mastery"' },
          ],
        },
      ),
    ).toEqual([
      'form "New member" sits below the list ul "Members"',
      'h2 "Mastery" sits below the list ul "Members"',
    ]);
  });
});

describe('summariseScreenRule', () => {
  it('counts the routes that break the rule and every violation', () => {
    expect(summariseScreenRule({ '/a': [], '/b': ['one', 'two'], '/c': ['three'] })).toEqual({
      routesWithViolations: 2,
      violations: 3,
    });
  });

  it('counts nothing on no route', () => {
    expect(summariseScreenRule({})).toEqual({ routesWithViolations: 0, violations: 0 });
  });
});
