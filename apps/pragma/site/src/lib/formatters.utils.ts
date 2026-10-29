const THIN_SPACE = ' ';

// @FollowsBlueprint utils-formatter
export function formatSessionDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return formatter.format(date);
}

export function formatClockTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  return formatter.format(date);
}

export function formatCapacity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value < 0) return '—';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

export function formatDueDate(iso: string | null, locale: string): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
}

export function isDueDatePast(iso: string | null, nowEpochMs: number): boolean {
  if (iso === null) return false;
  return new Date(iso).getTime() < nowEpochMs;
}

const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;

interface ElapsedUnitStep {
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly unitsBeforeNext: number;
}

const ELAPSED_UNIT_STEPS: readonly ElapsedUnitStep[] = [
  { unit: 'minute', unitsBeforeNext: MINUTES_PER_HOUR },
  { unit: 'hour', unitsBeforeNext: HOURS_PER_DAY },
  { unit: 'day', unitsBeforeNext: DAYS_PER_MONTH },
  { unit: 'month', unitsBeforeNext: MONTHS_PER_YEAR },
];
const LARGEST_ELAPSED_UNIT: Intl.RelativeTimeFormatUnit = 'year';

export function formatTimeAgo(iso: string, nowEpochMs: number, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  let elapsed = Math.max(0, Math.floor((nowEpochMs - date.getTime()) / MILLISECONDS_PER_MINUTE));
  for (const step of ELAPSED_UNIT_STEPS) {
    if (elapsed < step.unitsBeforeNext) return formatter.format(-elapsed, step.unit);
    elapsed = Math.floor(elapsed / step.unitsBeforeNext);
  }
  return formatter.format(-elapsed, LARGEST_ELAPSED_UNIT);
}
