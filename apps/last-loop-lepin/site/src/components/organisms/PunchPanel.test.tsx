import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';

const registerPunch = vi.fn();

vi.mock('../../lib/queries/punches', () => ({
  useRegisterPunch: () => ({ mutate: registerPunch, isPending: false }),
}));

vi.mock('../../observability/sentry', () => ({
  recordAnalyticsEvent: () => undefined,
}));

const { PunchPanel } = await import('./PunchPanel');

const RACE_START = '2026-06-13T04:00:00.000Z';
const RACE_START_MS = new Date(RACE_START).getTime();
const HOUR_MS = 60 * 60 * 1000;

const EDITION: RaceEditionDto = {
  slug: 'lepin-2026',
  displayName: 'Last Loop Lépin 2026',
  startsAt: RACE_START,
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
};

const ALICE: RankedRunnerDto = {
  runner: {
    editionSlug: 'lepin-2026',
    slug: 'alice',
    displayName: 'Alice',
    photoKey: null,
    photoUrl: null,
    bib: 1,
  },
  rank: 1,
  status: { kind: 'in-race', lastLoop: 0 },
  lastLoopDurationMs: null,
  lastFinishedAt: null,
};

function Wrapper({ children }: { readonly children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// @FollowsBlueprint test-component-render
describe('PunchPanel', () => {
  beforeEach(() => {
    registerPunch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows one tile per runner still in the race', () => {
    render(<PunchPanel edition={EDITION} ranked={[ALICE]} now={new Date(RACE_START_MS)} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByRole('button', { name: /Alice/ })).toBeDefined();
  });

  it('marks the tile as punched as soon as the organiser taps it', async () => {
    const user = userEvent.setup();
    render(<PunchPanel edition={EDITION} ranked={[ALICE]} now={new Date(RACE_START_MS)} />, {
      wrapper: Wrapper,
    });
    await user.click(screen.getByRole('button', { name: /Alice/ }));
    expect(registerPunch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Alice/ }).dataset.tone).toBe('punched');
  });

  it('stops showing a pending punch once the race ticks into the next loop, the overlay carrying the loop it belongs to and so no longer matching', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PunchPanel edition={EDITION} ranked={[ALICE]} now={new Date(RACE_START_MS)} />,
      { wrapper: Wrapper },
    );
    await user.click(screen.getByRole('button', { name: /Alice/ }));
    expect(screen.getByRole('button', { name: /Alice/ }).dataset.tone).toBe('punched');

    rerender(
      <PunchPanel edition={EDITION} ranked={[ALICE]} now={new Date(RACE_START_MS + HOUR_MS)} />,
    );
    expect(screen.getByRole('button', { name: /Alice/ }).dataset.tone).not.toBe('punched');
  });

  it('keeps showing a runner the server already credited as punched', () => {
    const credited: RankedRunnerDto = { ...ALICE, status: { kind: 'in-race', lastLoop: 1 } };
    render(<PunchPanel edition={EDITION} ranked={[credited]} now={new Date(RACE_START_MS)} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByRole('button', { name: /Alice/ }).dataset.tone).toBe('punched');
  });
});
