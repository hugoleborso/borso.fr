export interface SyncedEvent {
  id: string;
  receivedAt: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// @FollowsBlueprint domain-shared-selection
export function isEventRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseUuid(value: unknown): string | null {
  const text = String(value);
  return text === value && UUID_PATTERN.test(text) ? text : null;
}

export function parseInstant(value: unknown): string | null {
  const text = String(value);
  return text === value && !Number.isNaN(Date.parse(text)) ? text : null;
}

export function parseReceivedAt(value: unknown): string | null | undefined {
  if (value === null) return null;
  return parseInstant(value) ?? undefined;
}

export function selectEarliestInstant(event: SyncedEvent, deviceInstant: string, now: Date): Date {
  const candidates = [Date.parse(deviceInstant), now.getTime()];
  if (event.receivedAt !== null) candidates.push(Date.parse(event.receivedAt));
  return new Date(Math.min(...candidates));
}

export function sortByInstantThenId<Event extends SyncedEvent>(
  events: readonly Event[],
  readInstant: (event: Event) => Date,
): Event[] {
  return events
    .map((event) => ({ event, instant: readInstant(event).getTime() }))
    .toSorted(
      (left, right) =>
        left.instant - right.instant || left.event.id.localeCompare(right.event.id, 'en'),
    )
    .map((timed) => timed.event);
}

export function mergeSyncedEvents<Event extends SyncedEvent>(
  local: readonly Event[],
  remote: readonly Event[],
): Event[] {
  const merged = new Map<string, Event>();
  for (const event of [...local, ...remote]) {
    const known = merged.get(event.id);
    if (known === undefined || (known.receivedAt === null && event.receivedAt !== null)) {
      merged.set(event.id, event);
    }
  }
  return [...merged.values()];
}
