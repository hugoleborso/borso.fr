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

// @FollowsBlueprint test-machine-driver
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
