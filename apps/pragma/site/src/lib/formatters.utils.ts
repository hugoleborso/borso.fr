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

export function formatCapacity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value < 0) return '—';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}
