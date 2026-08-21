import { describe, expect, it } from 'vitest';
import { type SelectableEdition, selectCurrentEdition } from './edition-selection.core';

function edition(
  slug: string,
  status: SelectableEdition['status'],
  startsAt: string,
  endsAt: string,
) {
  return { slug, status, startsAt, endsAt };
}

const SETUP_EARLY = edition('early', 'setup', '2026-03-01T08:00:00Z', '2026-03-01T20:00:00Z');
const SETUP_LATE = edition('late', 'setup', '2026-09-01T08:00:00Z', '2026-09-01T20:00:00Z');
const FINISHED_OLD = edition('old', 'finished', '2024-03-01T08:00:00Z', '2024-03-01T20:00:00Z');
const FINISHED_RECENT = edition(
  'recent',
  'finished',
  '2025-03-01T08:00:00Z',
  '2025-03-01T20:00:00Z',
);
const LIVE = edition('live', 'live', '2026-06-01T08:00:00Z', '2026-06-01T20:00:00Z');

// @FollowsBlueprint test-pure-unit
describe('selectCurrentEdition', () => {
  it('prefers the live edition over anything else', () => {
    expect(selectCurrentEdition([SETUP_EARLY, FINISHED_RECENT, LIVE])).toBe(LIVE);
  });

  it('falls back to the setup edition starting soonest', () => {
    expect(selectCurrentEdition([SETUP_LATE, FINISHED_RECENT, SETUP_EARLY])).toBe(SETUP_EARLY);
  });

  it('falls back to the finished edition that ended last', () => {
    expect(selectCurrentEdition([FINISHED_OLD, FINISHED_RECENT])).toBe(FINISHED_RECENT);
  });

  it('returns nothing for an empty list', () => {
    expect(selectCurrentEdition([])).toBeNull();
  });

  it('reads dates the same whether they arrive as strings or as Date objects', () => {
    const asDates = [
      {
        ...SETUP_LATE,
        startsAt: new Date(SETUP_LATE.startsAt),
        endsAt: new Date(SETUP_LATE.endsAt),
      },
      {
        ...SETUP_EARLY,
        startsAt: new Date(SETUP_EARLY.startsAt),
        endsAt: new Date(SETUP_EARLY.endsAt),
      },
    ];

    expect(selectCurrentEdition(asDates)?.slug).toBe('early');
  });
});
