import { recordProductEvent } from '@/observability/error-reporting.adapter';
import { type DeviceIdentityStorage, readDeviceId } from './device-identity.utils';
import { appendReviewEvent } from './review-log.store';
import type { ReviewMachineOptions } from './review-machine.utils';

function readDeviceStorage(): DeviceIdentityStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function buildUuid(): string {
  return crypto.randomUUID();
}

export function readThisDeviceId(): string {
  return readDeviceId(readDeviceStorage(), buildUuid);
}

export function readNow(): Date {
  return new Date();
}

export function readUtcOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

// @FollowsBlueprint machine-impure-edge
export const reviewEffects: ReviewMachineOptions = {
  readNow,
  readUtcOffsetMinutes,
  readDeviceId: readThisDeviceId,
  buildEventId: buildUuid,
  storeReviewEvent: appendReviewEvent,
  recordProductEvent,
  scheduleTimeout: (callback, delayMilliseconds) => {
    setTimeout(callback, delayMilliseconds);
  },
};
