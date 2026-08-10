/**
 * The countdown to the next loop boundary of a running edition.
 *
 * The target moves with the clock — each boundary that passes becomes the one
 * after it — so working it out needs a live reading rather than whatever the
 * time was when the page last rendered. Subscribing here rather than in
 * `SpectatorPage` keeps the per-second re-render inside the countdown, which
 * already re-renders on every tick anyway.
 */

import { useSyncExternalStore } from 'react';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock-store';
import { Countdown } from '../molecules/Countdown';
import { projectNextLoopBoundaryMs } from './spectator.core';
import type { RaceEditionDto } from '../../lib/race.types';

interface NextLoopCountdownProps {
  readonly edition: RaceEditionDto;
  readonly label: string;
}

// @FollowsBlueprint molecule-clock-subscriber
export function NextLoopCountdown({ edition, label }: NextLoopCountdownProps) {
  const nowMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  return <Countdown targetEpochMs={projectNextLoopBoundaryMs(edition, nowMs)} label={label} />;
}
