const PARIS_TIME_ZONE = 'Europe/Paris';
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_LENGTH = 10;
const ISO_MINUTE_LENGTH = 16;
const TIME_SEPARATOR_PATTERN = /:/g;

const PARIS_TIMESTAMP_FORMAT = new Intl.DateTimeFormat('sv-SE', {
  timeZone: PARIS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function formatParisTimestamp(instant: Date): string {
  return PARIS_TIMESTAMP_FORMAT.format(instant);
}

// @FollowsBlueprint utils-formatter
export function formatParisDate(instant: Date): string {
  return formatParisTimestamp(instant).slice(0, ISO_DATE_LENGTH);
}

export function formatParisMinute(instant: Date): string {
  return formatParisTimestamp(instant).slice(0, ISO_MINUTE_LENGTH);
}

export function formatParisFileStamp(instant: Date): string {
  const timestamp = formatParisTimestamp(instant);
  const time = timestamp.slice(ISO_DATE_LENGTH + 1).replaceAll(TIME_SEPARATOR_PATTERN, '');
  return `${timestamp.slice(0, ISO_DATE_LENGTH)}-${time}`;
}

export function addDaysToDate(isoDate: string, days: number): string {
  const shifted = new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * MILLISECONDS_PER_DAY);
  return shifted.toISOString().slice(0, ISO_DATE_LENGTH);
}
