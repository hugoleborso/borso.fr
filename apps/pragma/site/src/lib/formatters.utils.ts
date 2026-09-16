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
