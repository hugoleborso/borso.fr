import { EVERY_STALE_SCOPE, type StaleScope } from '@domain/stale-scope.core';

export interface StaleScopeRule {
  readonly path: readonly string[];
  readonly scope: StaleScope | null;
}

const ANY_SEGMENT = '*';
const PATH_SEPARATOR = '/';
const ROUTE_SEPARATOR = ' ';
const READ_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

export const STALE_SCOPE_RULES: readonly StaleScopeRule[] = [
  { path: ['api', 'admin'], scope: null },
  { path: ['api', 'assistant-grants'], scope: null },
  { path: ['api', 'audience'], scope: 'audience' },
  { path: ['api', 'auth'], scope: null },
  { path: ['api', 'bars'], scope: 'bars' },
  { path: ['api', 'improvements'], scope: 'improvements' },
  { path: ['api', 'instruments'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'mastery'], scope: 'mastery' },
  { path: ['api', 'me', 'contact'], scope: 'members' },
  { path: ['api', 'me', 'calendar-feeds'], scope: 'free-slots' },
  { path: ['api', 'me', 'passkeys'], scope: null },
  { path: ['api', 'me', 'password'], scope: null },
  { path: ['api', 'members'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'notifications'], scope: null },
  { path: ['api', 'oauth'], scope: null },
  { path: ['api', 'outreach'], scope: 'outreach' },
  { path: ['api', 'sessions'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'setlists', ANY_SEGMENT, 'votes'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'setlists', ANY_SEGMENT, 'vote-status'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'setlists', ANY_SEGMENT, 'close'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'setlists'], scope: 'setlists' },
  { path: ['api', 'songs'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'studies'], scope: EVERY_STALE_SCOPE },
  { path: ['api', 'takes', 'sign'], scope: null },
  { path: ['api', 'takes'], scope: 'takes' },
  { path: ['api', 'tasks'], scope: 'tasks' },
  { path: ['api', 'transition-comments'], scope: 'transition-comments' },
  { path: ['api', 'uploads'], scope: null },
  { path: ['api', '__test'], scope: null },
  { path: ['mcp'], scope: null },
  { path: ['oauth'], scope: null },
];

function splitPath(path: string): readonly string[] {
  return path.split(PATH_SEPARATOR).filter((segment) => segment.length > 0);
}

function isRuleMatching(rule: StaleScopeRule, segments: readonly string[]): boolean {
  if (segments.length < rule.path.length) return false;
  return rule.path.every(
    (expected, index) => expected === ANY_SEGMENT || expected === segments[index],
  );
}

// @FollowsBlueprint core-lookup-table
export function findStaleScopeRule(
  path: string,
  rules: readonly StaleScopeRule[] = STALE_SCOPE_RULES,
): StaleScopeRule | null {
  const segments = splitPath(path);
  return rules.find((rule) => isRuleMatching(rule, segments)) ?? null;
}

export function isReadMethod(method: string): boolean {
  return READ_METHODS.has(method.toUpperCase());
}

export function selectStaleScope(method: string, path: string): StaleScope | null {
  if (isReadMethod(method)) return null;
  return findStaleScopeRule(path)?.scope ?? null;
}

export function isRouteGoingStale(route: string): boolean {
  const separatorIndex = route.indexOf(ROUTE_SEPARATOR);
  if (separatorIndex === -1) return false;
  return selectStaleScope(route.slice(0, separatorIndex), route.slice(separatorIndex + 1)) !== null;
}

export function selectToolStaleScope(tool: {
  readonly routes: readonly string[];
}): StaleScope | null {
  return tool.routes.some(isRouteGoingStale) ? EVERY_STALE_SCOPE : null;
}

const SUCCESS_STATUS_FLOOR = 200;
const SUCCESS_STATUS_CEILING = 299;

export interface AnsweredWrite {
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly rememberedScope: StaleScope | null;
}

export function selectAnnouncedStaleScope(write: AnsweredWrite): StaleScope | null {
  const isSuccessful =
    write.status >= SUCCESS_STATUS_FLOOR && write.status <= SUCCESS_STATUS_CEILING;
  if (!isSuccessful) return null;
  return write.rememberedScope ?? selectStaleScope(write.method, write.path);
}
