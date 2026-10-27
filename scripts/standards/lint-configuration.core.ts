export type RuleSetting = unknown;

export interface LintOverride {
  readonly files: readonly string[];
  readonly plugins: readonly string[];
  readonly rules: Readonly<Record<string, RuleSetting>>;
}

export interface JavaScriptPluginEntry {
  readonly name: string;
  readonly specifier: string;
}

export interface LintConfiguration {
  readonly plugins: readonly string[];
  readonly jsPlugins: readonly JavaScriptPluginEntry[];
  readonly rules: Readonly<Record<string, RuleSetting>>;
  readonly overrides: readonly LintOverride[];
}

export type GlobMatcher = (path: string, pattern: string) => boolean;

const GLOB_METACHARACTERS = /[*?[\]{}()!+@\\]/;
const WILDCARD = '*';

const OFF_SEVERITIES: ReadonlySet<unknown> = new Set(['off', 'allow', 0]);
const CORE_RULE_PREFIX = 'eslint';
const OPENING_PARENTHESIS = '(';
const CLOSING_PARENTHESIS = ')';
const CONFIGURED_PLUGIN_BY_REPORTED_PLUGIN: ReadonlyMap<string, string> = new Map([
  ['react-hooks', 'react'],
]);

function isRuleOn(setting: RuleSetting): boolean {
  const severity: unknown = Array.isArray(setting) ? setting[0] : setting;
  return !OFF_SEVERITIES.has(severity);
}

export function readRulePlugin(ruleName: string): string {
  const separator = ruleName.lastIndexOf('/');
  return separator === -1 ? CORE_RULE_PREFIX : ruleName.slice(0, separator);
}

export function listActiveRules(
  configuration: LintConfiguration,
  path: string,
  isMatch: GlobMatcher,
): readonly string[] {
  const settings = new Map<string, RuleSetting>(Object.entries(configuration.rules));
  const plugins = new Set<string>([CORE_RULE_PREFIX, ...configuration.plugins]);
  for (const entry of configuration.jsPlugins) plugins.add(entry.name);
  for (const override of configuration.overrides) {
    if (!override.files.some((pattern) => isMatch(path, pattern))) continue;
    for (const plugin of override.plugins) plugins.add(plugin);
    for (const [ruleName, setting] of Object.entries(override.rules)) {
      settings.set(ruleName, setting);
    }
  }
  return [...settings]
    .filter(([ruleName, setting]) => isRuleOn(setting) && plugins.has(readRulePlugin(ruleName)))
    .map(([ruleName]) => ruleName)
    .sort();
}

export function readConfiguredRuleName(diagnosticCode: string): string | null {
  const opening = diagnosticCode.indexOf(OPENING_PARENTHESIS);
  if (opening < 1 || !diagnosticCode.endsWith(CLOSING_PARENTHESIS)) return null;
  const reportedPlugin = diagnosticCode.slice(0, opening);
  const rule = diagnosticCode.slice(opening + 1, -1);
  if (reportedPlugin === CORE_RULE_PREFIX) return rule;
  const plugin = CONFIGURED_PLUGIN_BY_REPORTED_PLUGIN.get(reportedPlugin) ?? reportedPlugin;
  return `${plugin}/${rule}`;
}

export function readLiteralSuffix(pattern: string): string {
  const tail = pattern.slice(pattern.lastIndexOf(WILDCARD) + 1);
  return GLOB_METACHARACTERS.test(tail) ? '' : tail;
}

export function skipImpossibleMatches(isMatch: GlobMatcher): GlobMatcher {
  return (path, pattern) => path.endsWith(readLiteralSuffix(pattern)) && isMatch(path, pattern);
}
