import { useSyncExternalStore } from 'react';
import { getCurrentTime, subscribeClock } from '../clock-store';

interface CountdownProps {
  readonly targetEpochMs: number;
  readonly label: string;
}

function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00:00';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number): string => `${value}`.padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function Countdown({ targetEpochMs, label }: CountdownProps) {
  const now = useSyncExternalStore(subscribeClock, getCurrentTime, () => Date.now());
  const remaining = targetEpochMs - now;
  return (
    <div className="countdown">
      <small>{label}</small>
      <div className="mono">{formatRemaining(remaining)}</div>
    </div>
  );
}
