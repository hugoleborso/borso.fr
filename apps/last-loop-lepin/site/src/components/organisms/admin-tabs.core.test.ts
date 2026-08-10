import { describe, expect, it } from 'vitest';
import type { RaceEditionDto } from '../../lib/race.types';
import {
  ADMIN_TABS,
  selectEditionNeedingFinish,
  selectEditionPanelTab,
  isRaceOverInPractice,
  isTabBlockedByMissingEdition,
  selectTabClassName,
} from './admin-tabs.core';

// @FollowsBlueprint test-pure-unit
describe('ADMIN_TABS', () => {
  it('lists the five organiser tabs in order', () => {
    expect(ADMIN_TABS.map((tab) => tab.name)).toEqual([
      'setup',
      'runners',
      'punch',
      'did-not-finish',
      'corrections',
    ]);
  });
});

describe('selectTabClassName', () => {
  it('marks the tab in view as active', () => {
    expect(selectTabClassName('punch', 'punch')).toBe('active');
  });

  it('leaves the other tabs bare', () => {
    expect(selectTabClassName('punch', 'setup')).toBe('');
  });
});

describe('isTabBlockedByMissingEdition', () => {
  it('blocks nothing once an edition exists', () => {
    expect(isTabBlockedByMissingEdition('punch', true)).toBe(false);
  });

  it('leaves the setup tab open with no edition', () => {
    expect(isTabBlockedByMissingEdition('setup', false)).toBe(false);
  });

  it('blocks every other tab with no edition', () => {
    expect(isTabBlockedByMissingEdition('corrections', false)).toBe(true);
  });
});

describe('isRaceOverInPractice', () => {
  it('is false before anybody has registered', () => {
    expect(isRaceOverInPractice(0, 0)).toBe(false);
  });

  it('is false while somebody is still running', () => {
    expect(isRaceOverInPractice(5, 1)).toBe(false);
  });

  it('is true once every registered runner is out', () => {
    expect(isRaceOverInPractice(5, 0)).toBe(true);
  });
});

function buildEdition(overrides: Partial<RaceEditionDto> = {}): RaceEditionDto {
  return {
    slug: 'lepin-2026',
    displayName: 'Last Loop Lépin 2026',
    startsAt: '2026-06-13T04:00:00.000Z',
    endsAt: '2026-06-13T20:00:00.000Z',
    sunriseAt: '2026-06-13T03:45:00.000Z',
    sunsetAt: '2026-06-13T19:45:00.000Z',
    intervalMinutes: 60,
    status: 'live',
    gpx: {
      distanceMeters: 5_800,
      elevationGainMeters: 250,
      trackJson: { points: [] },
      startLatLng: { lat: 45.55, lng: 5.78 },
    },
    ...overrides,
  };
}

describe('selectEditionPanelTab', () => {
  it('returns nothing for the setup tab, which needs no edition', () => {
    expect(selectEditionPanelTab('setup')).toBeNull();
  });

  it('returns the tab for a panel that acts on an edition', () => {
    expect(selectEditionPanelTab('punch')).toBe('punch');
  });
});

describe('selectEditionNeedingFinish', () => {
  it('returns nothing when there is no edition', () => {
    expect(selectEditionNeedingFinish(null, 5, 0)).toBeNull();
  });

  it('returns nothing while the edition is not live', () => {
    expect(selectEditionNeedingFinish(buildEdition({ status: 'setup' }), 5, 0)).toBeNull();
  });

  it('returns nothing while somebody is still running', () => {
    expect(selectEditionNeedingFinish(buildEdition(), 5, 2)).toBeNull();
  });

  it('returns the edition once every registered runner is out', () => {
    expect(selectEditionNeedingFinish(buildEdition(), 5, 0)?.slug).toBe('lepin-2026');
  });
});
