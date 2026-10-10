const EXPLANATORY_KEY =
  /(?:hint|subtitle|intro|description|helper|help|explanation|instructions?|caption|lede|tagline)$/i;
const PATH_SEPARATOR = '.';
const APP_SEPARATOR = ':';

export type CopyExceptions = Readonly<Record<string, string>>;

export interface CopyProblem {
  readonly key: string;
  readonly message: string;
}

export function listMessagePaths(messages: unknown, prefix = ''): readonly string[] {
  if (typeof messages !== 'object' || messages === null) return [prefix];
  return Object.entries(messages).flatMap(([key, value]) =>
    listMessagePaths(value, prefix === '' ? key : `${prefix}${PATH_SEPARATOR}${key}`),
  );
}

export function isExplanatoryKey(path: string): boolean {
  return EXPLANATORY_KEY.test(path);
}

export function listExplanatoryKeys(app: string, messages: unknown): readonly string[] {
  return listMessagePaths(messages)
    .filter(isExplanatoryKey)
    .map((path) => `${app}${APP_SEPARATOR}${path}`);
}

export function listCopyProblems(
  found: readonly string[],
  exceptions: CopyExceptions,
): readonly CopyProblem[] {
  const present = new Set(found);
  const unlisted = found
    .filter((key) => !Object.hasOwn(exceptions, key))
    .map((key) => ({
      key,
      message:
        'names text that explains the interface; change the control, or record why the screen cannot show it',
    }));
  const unexplained = Object.entries(exceptions)
    .filter(([key, reason]) => present.has(key) && reason.trim() === '')
    .map(([key]) => ({ key, message: 'is excepted without a reason' }));
  const stale = Object.keys(exceptions)
    .filter((key) => !present.has(key))
    .map((key) => ({ key, message: 'is excepted but no longer exists; remove the exception' }));
  return [...unlisted, ...unexplained, ...stale];
}
