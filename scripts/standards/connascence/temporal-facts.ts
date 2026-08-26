import type { TemporalSite } from './connascence.types';

export const MILLISECOND = 1;
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const UNIT_OF_NAME_SUFFIX: readonly (readonly [string, number])[] = [
  ['_MILLISECONDS', MILLISECOND],
  ['_MS', MILLISECOND],
  ['_SECONDS', SECOND],
  ['_MINUTES', MINUTE],
  ['_HOURS', HOUR],
  ['_DAYS', DAY],
];

export const UNIT_OF_PROPERTY: Readonly<Record<string, number>> = {
  staleTime: MILLISECOND,
  gcTime: MILLISECOND,
  cacheTime: MILLISECOND,
  refetchInterval: MILLISECOND,
  retryDelay: MILLISECOND,
  timeout: MILLISECOND,
  delay: MILLISECOND,
  duration: MILLISECOND,
  interval: MILLISECOND,
  pollInterval: MILLISECOND,
  maxAge: SECOND,
  expiresIn: SECOND,
};

export const UNIT_OF_CDK_DURATION: Readonly<Record<string, number>> = {
  millis: MILLISECOND,
  seconds: SECOND,
  minutes: MINUTE,
  hours: HOUR,
  days: DAY,
};

export const CDK_DURATION_OBJECT = 'Duration';
export const SCHEDULING_CALLS = new Set(['setTimeout', 'setInterval']);
export const SCHEDULING_DELAY_ARGUMENT = 1;

const CACHE_CONTROL_DIRECTIVE = /\b(max-age|s-maxage|stale-while-revalidate)=(\d+)/g;
export const SERVER_DIRECTIVE = /^(max-age|s-maxage|stale-while-revalidate)=/;
export const CLIENT_FRESHNESS = /^(staleTime|gcTime|cacheTime|refetchInterval)[:=]|^POLL_/;
const TAILWIND_DURATION = /\bduration-(?:\[(\d+)(ms|s)\]|(\d+))\b/g;

const CONVERSION_FACTOR_NAME = /_TO_|_PER_/;

export function unitOfConstantName(name: string): number | null {
  if (CONVERSION_FACTOR_NAME.test(name.toUpperCase())) return null;
  for (const [suffix, unit] of UNIT_OF_NAME_SUFFIX) {
    if (name.toUpperCase().endsWith(suffix)) return unit;
  }
  return null;
}

export function collectTemporalFromText(path: string, line: number, text: string): TemporalSite[] {
  const sites: TemporalSite[] = [];
  for (const match of text.matchAll(CACHE_CONTROL_DIRECTIVE)) {
    const amount = Number(match[2]);
    if (amount > 0) {
      sites.push({
        path,
        line,
        milliseconds: amount * SECOND,
        expression: `${match[1] ?? ''}=${String(amount)}`,
      });
    }
  }
  for (const match of text.matchAll(TAILWIND_DURATION)) {
    const bracketed = match[1];
    const bare = match[3];
    const amount = Number(bracketed ?? bare);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const unit = bracketed !== undefined && match[2] === 's' ? SECOND : MILLISECOND;
    sites.push({
      path,
      line,
      milliseconds: amount * unit,
      expression: `duration-${bracketed === undefined ? String(bare) : `[${String(bracketed)}${String(match[2])}]`}`,
    });
  }
  return sites;
}
