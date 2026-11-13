import type { ReviewEvent } from '@domain/review-event.core';
import type { ProductEvent } from '@/observability/error-reporting.core';
import type { ReviewMachineOptions } from './review-machine.utils';
import { buildEventId, PHONE } from './review.test-utils';

interface ScheduledCallback {
  callback: () => void;
  delayMilliseconds: number;
}

interface ReviewDriver {
  options: ReviewMachineOptions;
  storedEvents: ReviewEvent[];
  productEvents: ProductEvent[];
  pendingTimers: ScheduledCallback[];
  fireNextTimer: () => void;
  clock: { now: Date; utcOffsetMinutes: number };
}

/**
 * @Blueprint test-machine-driver
 * @BlueprintName Machine Test Driver
 * @BlueprintUsage Use to make a machine that owns timers and randomness fully deterministic, in a `.test-utils.ts` sibling the test glob does not pick up.
 * @BlueprintDescription Returns the `options` object the machine is built with alongside the handles a test steers it by. `scheduleTimeout` pushes onto a `pendingTimers` array instead of calling the event loop, so `fireNextTimer` decides when a reply lands and throws when nothing is pending rather than passing silently. `pickRandom` shifts from `rngQueue` and falls back to the first candidate, so a test names only the choices it cares about. `opponentDelayMs` is deliberately absent, so the machine uses its production default and the test can assert the value it scheduled with.
 */
export function buildReviewDriver(): ReviewDriver {
  const storedEvents: ReviewEvent[] = [];
  const productEvents: ProductEvent[] = [];
  const pendingTimers: ScheduledCallback[] = [];
  const clock = { now: new Date('2026-01-10T22:30:00.000Z'), utcOffsetMinutes: 0 };
  const sequence = { next: 1 };
  return {
    storedEvents,
    productEvents,
    pendingTimers,
    clock,
    fireNextTimer: () => {
      const next = pendingTimers.shift();
      if (!next) throw new Error('no pending timer');
      next.callback();
    },
    options: {
      readNow: () => clock.now,
      readUtcOffsetMinutes: () => clock.utcOffsetMinutes,
      readDeviceId: () => PHONE,
      buildEventId: () => {
        const eventId = buildEventId(sequence.next);
        sequence.next += 1;
        return eventId;
      },
      storeReviewEvent: (event) => {
        storedEvents.push(event);
      },
      recordProductEvent: (event) => {
        productEvents.push(event);
      },
      scheduleTimeout: (callback, delayMilliseconds) => {
        pendingTimers.push({ callback, delayMilliseconds });
      },
    },
  };
}
