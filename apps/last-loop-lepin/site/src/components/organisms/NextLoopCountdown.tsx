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
