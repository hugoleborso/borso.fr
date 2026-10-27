export type RuleSetting = unknown;

export interface LintOverride {
  readonly files: readonly string[];
  readonly plugins?: readonly string[];
  readonly rules?: Readonly<Record<string, RuleSetting>>;
}

export interface JavaScriptPluginEntry {
  readonly name: string;
  readonly specifier: string;
}

export interface LintConfiguration {
  readonly plugins?: readonly string[];
  readonly jsPlugins?: readonly JavaScriptPluginEntry[];
  readonly rules?: Readonly<Record<string, RuleSetting>>;
  readonly overrides?: readonly LintOverride[];
}

export type GlobMatcher = (path: string, pattern: string) => boolean;

const OFF_SEVERITIES: ReadonlySet<unknown> = new Set(['off', 'allow', 0]);
const CORE_RULE_PREFIX = 'eslint';
const DIAGNOSTIC_CODE = /^(?<plugin>.+)\((?<rule>[^()]+)\)$/;

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
  const settings = new Map<string, RuleSetting>(Object.entries(configuration.rules ?? {}));
  const plugins = new Set<string>([CORE_RULE_PREFIX, ...(configuration.plugins ?? [])]);
  for (const entry of configuration.jsPlugins ?? []) plugins.add(entry.name);
  for (const override of configuration.overrides ?? []) {
    if (!override.files.some((pattern) => isMatch(path, pattern))) continue;
    for (const plugin of override.plugins ?? []) plugins.add(plugin);
    for (const [ruleName, setting] of Object.entries(override.rules ?? {})) {
      settings.set(ruleName, setting);
    }
  }
  return [...settings]
    .filter(([ruleName, setting]) => isRuleOn(setting) && plugins.has(readRulePlugin(ruleName)))
    .map(([ruleName]) => ruleName)
    .sort();
}

export function readConfiguredRuleName(diagnosticCode: string | undefined): string | null {
  if (diagnosticCode === undefined) return null;
  const groups = DIAGNOSTIC_CODE.exec(diagnosticCode)?.groups;
  if (groups?.plugin === undefined || groups.rule === undefined) return null;
  return groups.plugin === CORE_RULE_PREFIX ? groups.rule : `${groups.plugin}/${groups.rule}`;
}
