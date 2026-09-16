import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { VoteCountdown } from './VoteCountdown';

const ROUND_DURATION_MS = 30_000;
const NOW = new Date('2026-08-26T21:00:00.000Z');

function renderCountdown(): void {
  render(
    <VoteCountdown
      openedAtEpochMs={NOW.getTime()}
      closesAtEpochMs={NOW.getTime() + ROUND_DURATION_MS}
    />,
  );
}

// @FollowsBlueprint test-component-render
describe('the countdown the room reads', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('opens on the whole round', () => {
    renderCountdown();
    expect(screen.getByRole('timer').textContent).toContain('30');
  });

  it('advances once a second without the component owning a timer', async () => {
    renderCountdown();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(screen.getByRole('timer').textContent).toContain('27');
  });

  it('clears the interval once the last reader has left, so the suite can exit', async () => {
    const stopInterval = vi.spyOn(globalThis, 'clearInterval');
    renderCountdown();
    await vi.advanceTimersByTimeAsync(1_000);
    cleanup();
    expect(stopInterval).toHaveBeenCalled();
    stopInterval.mockRestore();
  });
});
