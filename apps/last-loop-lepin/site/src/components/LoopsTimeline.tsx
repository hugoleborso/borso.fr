import type { RaceEditionDto } from '../domain/types';

interface LoopsTimelineProps {
  readonly edition: RaceEditionDto;
}

function formatHour(epochMs: number): string {
  const date = new Date(epochMs);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function LoopsTimeline({ edition }: LoopsTimelineProps) {
  const startMs = new Date(edition.startsAt).getTime();
  const endMs = new Date(edition.endsAt).getTime();
  const intervalMs = edition.intervalMinutes * 60_000;
  const sunriseMs = new Date(edition.sunriseAt).getTime();
  const sunsetMs = new Date(edition.sunsetAt).getTime();

  const tops: number[] = [];
  for (let cursor = startMs; cursor <= endMs; cursor += intervalMs) {
    tops.push(cursor);
  }

  const allEvents: Array<{ readonly epochMs: number; readonly kind: 'top' | 'sunrise' | 'sunset' }> = [
    ...tops.map((epochMs) => ({ epochMs, kind: 'top' as const })),
    { epochMs: sunriseMs, kind: 'sunrise' as const },
    { epochMs: sunsetMs, kind: 'sunset' as const },
  ].toSorted((left, right) => left.epochMs - right.epochMs);

  return (
    <div className="timeline">
      {allEvents.map((event) => (
        <div
          className={`timeline-tick ${event.kind === 'sunrise' ? 'sunrise' : event.kind === 'sunset' ? 'sunset' : ''}`}
          key={`${event.kind}-${event.epochMs}`}
        >
          <span className="hour">{formatHour(event.epochMs)}</span>
          <span className="muted">
            {event.kind === 'sunrise' ? 'Lever du soleil' : event.kind === 'sunset' ? 'Coucher du soleil' : 'Top horaire'}
          </span>
        </div>
      ))}
    </div>
  );
}
