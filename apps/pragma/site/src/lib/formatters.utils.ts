/**
 * Pure formatters used across the UI.
 *  - `formatSessionDate(iso, locale)` formats an ISO string into a
 *    locale-aware "Sat 13 Sep 2025" / "sam. 13 sept. 2025" line.
 *  - `formatCapacity(value)` returns `'—'` on null / undefined, the
 *    integer formatted with thin spaces otherwise.
 *
 * No DOM, no React. 100%-covered.
 */

const THIN_SPACE = ' ';
const THOUSAND = 1_000;

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
  if (value < THOUSAND) return String(value);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}
