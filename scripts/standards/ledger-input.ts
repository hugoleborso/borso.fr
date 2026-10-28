import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { z } from 'zod';
import { readStandardCitations, type Citation } from './citations.core';
import { findGate, GATE_DEFINITIONS } from './gates.core';
import {
  listActiveRules,
  skipImpossibleMatches,
  type LintConfiguration,
} from './lint-configuration.core';
import {
  resolveCitation,
  type LedgerInput,
  type MechanismFacts,
  type OrphanMechanism,
  type ResolvedCitation,
} from './ledger.core';

const MATCHES_GLOB = skipImpossibleMatches(matchesGlob);

const REPOSITORY_ROOT = process.cwd();
const STANDARDS_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'standards');
const HOOKS_DIRECTORY = join(REPOSITORY_ROOT, '.husky');
const WORKFLOWS_DIRECTORY = join(REPOSITORY_ROOT, '.github', 'workflows');
const AGENT_HOOKS_DIRECTORY = join(REPOSITORY_ROOT, '.claude', 'hooks');
const PLUGIN_HOOKS_DIRECTORY = join(REPOSITORY_ROOT, 'plugins', 'borso-harness', 'hooks');
const APPS_DIRECTORY = join(REPOSITORY_ROOT, 'apps');
const LINT_CONFIGURATION_FILE = join(REPOSITORY_ROOT, '.oxlintrc.json');
const STANDARD_FILE_PATTERN = /^\d\d-[a-z0-9-]+\.md$/;
export const CHECK_SCRIPT_PATTERN = /^scripts\/(?:[a-z0-9-]+\/)*check-[a-z0-9-]+\.(?:sh|ts)$/;

export const MECHANISMS_OUTSIDE_THE_STANDARDS: ReadonlySet<string> = new Set([
  'scripts/check-branch-context.sh',
  'scripts/check-negative-claims-are-dated.sh',
]);

function listStandardFiles(): readonly string[] {
  return readdirSync(STANDARDS_DIRECTORY)
    .filter((name) => STANDARD_FILE_PATTERN.test(name))
    .sort();
}

function resolveSiteRoot(app: string): string | null {
  if (existsSync(join(APPS_DIRECTORY, app, 'site', 'src'))) return `apps/${app}/site/src`;
  if (existsSync(join(APPS_DIRECTORY, app, 'site'))) return `apps/${app}/site`;
  return null;
}

interface Probe {
  readonly scope: string;
  readonly path: string;
}

function collectProbes(): readonly Probe[] {
  const probes: Probe[] = [];
  for (const app of readdirSync(APPS_DIRECTORY).sort()) {
    const siteRoot = resolveSiteRoot(app);
    if (siteRoot !== null) {
      const scope = `${app}/site`;
      probes.push(
        { scope, path: `${siteRoot}/components/atoms/Probe.tsx` },
        { scope, path: `${siteRoot}/components/molecules/Probe.tsx` },
        { scope, path: `${siteRoot}/components/organisms/Probe.tsx` },
        { scope, path: `${siteRoot}/routes/Probe.tsx` },
        { scope, path: `${siteRoot}/lib/probe.utils.ts` },
        { scope, path: `${siteRoot}/lib/probe.core.ts` },
        { scope, path: `${siteRoot}/probe.adapter.ts` },
      );
    }
    if (existsSync(join(APPS_DIRECTORY, app, 'api', 'src'))) {
      const scope = `${app}/api`;
      const apiRoot = `apps/${app}/api/src`;
      probes.push(
        { scope, path: `${apiRoot}/probe/probe.controller.ts` },
        { scope, path: `${apiRoot}/probe/probe.service.ts` },
        { scope, path: `${apiRoot}/probe/probe.repository.ts` },
        { scope, path: `${apiRoot}/probe/probe.core.ts` },
        { scope, path: `${apiRoot}/probe/probe.adapter.ts` },
      );
    }
  }
  probes.push(
    { scope: 'infra', path: 'infra/cdk/src/probe.ts' },
    { scope: 'infra', path: 'infra/cdk/src/probe.core.ts' },
    { scope: 'tooling', path: 'scripts/probe.ts' },
    { scope: 'tooling', path: 'eslint-rules/probe.js' },
  );
  return probes;
}

const collected: { probes?: readonly Probe[]; scopes?: readonly string[] } = {};

function listProbes(): readonly Probe[] {
  collected.probes ??= collectProbes();
  return collected.probes;
}

const RULE_SETTINGS = z.record(z.string(), z.unknown());

const LINT_CONFIGURATION = z.object({
  plugins: z.array(z.string()).default([]),
  jsPlugins: z.array(z.object({ name: z.string(), specifier: z.string() })).default([]),
  rules: RULE_SETTINGS.default({}),
  overrides: z
    .array(
      z.object({
        files: z.array(z.string()),
        plugins: z.array(z.string()).default([]),
        rules: RULE_SETTINGS.default({}),
      }),
    )
    .default([]),
});

export function readLintConfiguration(): LintConfiguration {
  const parsed: unknown = JSON.parse(readFileSync(LINT_CONFIGURATION_FILE, 'utf8'));
  return LINT_CONFIGURATION.parse(parsed);
}

function mapRulesToActiveScopes(): ReadonlyMap<string, readonly string[]> {
  const configuration = readLintConfiguration();
  const scopesByRule = new Map<string, string[]>();
  for (const probe of listProbes()) {
    for (const ruleName of listActiveRules(configuration, probe.path, MATCHES_GLOB)) {
      const scopes = scopesByRule.get(ruleName) ?? [];
      if (!scopes.includes(probe.scope)) scopes.push(probe.scope);
      scopesByRule.set(ruleName, scopes);
    }
  }
  return scopesByRule;
}

function collectScopes(): readonly string[] {
  const scopes: string[] = [];
  for (const probe of listProbes()) if (!scopes.includes(probe.scope)) scopes.push(probe.scope);
  return scopes;
}

function listAllScopes(): readonly string[] {
  collected.scopes ??= collectScopes();
  return collected.scopes;
}

function selectCandidateScopes(activeScopes: readonly string[]): readonly string[] {
  const layers = new Set(activeScopes.map(readScopeLayer));
  return listAllScopes().filter((scope) => layers.has(readScopeLayer(scope)));
}

function readScopeLayer(scope: string): string {
  return scope.includes('/') ? (scope.split('/')[1] ?? scope) : scope;
}

function readRegisteredCustomRules(): ReadonlySet<string> {
  const indexSource = readFileSync(join(REPOSITORY_ROOT, 'eslint-rules', 'index.js'), 'utf8');
  const registered = new Set<string>();
  for (const match of indexSource.matchAll(/^\s*'([a-z0-9-]+)':/gm)) {
    const ruleName = match[1];
    if (ruleName !== undefined) registered.add(`borso/${ruleName}`);
  }
  return registered;
}

const siteTexts = new Map<string, string>();

function readSiteText(site: string): string {
  const cached = siteTexts.get(site);
  if (cached !== undefined) return cached;
  const path = join(REPOSITORY_ROOT, site);
  const text = existsSync(path) ? readFileSync(path, 'utf8') : '';
  siteTexts.set(site, text);
  return text;
}

export function listInvocationSites(): readonly string[] {
  const sites: string[] = [];
  for (const [directory, prefix] of [
    [HOOKS_DIRECTORY, '.husky'],
    [WORKFLOWS_DIRECTORY, '.github/workflows'],
    [AGENT_HOOKS_DIRECTORY, '.claude/hooks'],
    [PLUGIN_HOOKS_DIRECTORY, 'plugins/borso-harness/hooks'],
  ] as const) {
    if (!existsSync(directory)) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isFile()) sites.push(`${prefix}/${entry.name}`);
    }
  }
  return sites;
}

export function listTrackedFiles(): readonly string[] {
  return execFileSync('git', ['ls-files'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.length > 0);
}

interface Repository {
  readonly scopesByRule: ReadonlyMap<string, readonly string[]>;
  readonly registeredCustomRules: ReadonlySet<string>;
  readonly invocationSites: readonly string[];
  readonly trackedFiles: readonly string[];
}

function selectInvokingSites(repository: Repository, target: string): readonly string[] {
  return repository.invocationSites.filter((site) => readSiteText(site).includes(target));
}

function readMechanismFacts(citation: Citation, repository: Repository): MechanismFacts {
  const everywhere = listAllScopes();
  switch (citation.kind) {
    case 'oxlint': {
      const activeScopes = repository.scopesByRule.get(citation.target) ?? [];
      const isCustom = citation.target.startsWith('borso/');
      return {
        exists: isCustom
          ? repository.registeredCustomRules.has(citation.target)
          : activeScopes.length > 0,
        activeScopes,
        candidateScopes: selectCandidateScopes(activeScopes),
      };
    }
    case 'script':
    case 'generator': {
      const exists = repository.trackedFiles.includes(citation.target);
      const activeScopes = exists ? selectInvokingSites(repository, citation.target) : [];
      return { exists, activeScopes, candidateScopes: activeScopes };
    }
    case 'gate': {
      const gate = findGate(citation.target);
      if (gate === null) return { exists: false, activeScopes: [], candidateScopes: [] };
      const activeScopes = gate.sites.filter((site) =>
        readSiteText(site).includes(gate.siteMustContain),
      );
      return { exists: true, activeScopes, candidateScopes: gate.sites };
    }
    case 'types': {
      const matching = repository.trackedFiles.filter(
        (file) => file === citation.target || file.endsWith(`/${citation.target}`),
      );
      return { exists: matching.length > 0, activeScopes: matching, candidateScopes: matching };
    }
    case 'test': {
      const matching = repository.trackedFiles.filter(
        (file) => file === citation.target || file.endsWith(`/${citation.target}`),
      );
      return { exists: matching.length > 0, activeScopes: matching, candidateScopes: matching };
    }
    case 'reviewer': {
      return { exists: true, activeScopes: everywhere, candidateScopes: everywhere };
    }
  }
}

function listOrphanMechanisms(
  repository: Repository,
  citedTargets: ReadonlySet<string>,
): readonly OrphanMechanism[] {
  const orphans: OrphanMechanism[] = [];
  for (const ruleName of [...repository.registeredCustomRules].sort()) {
    if (!citedTargets.has(ruleName)) orphans.push({ kind: 'oxlint', target: ruleName });
  }
  for (const file of repository.trackedFiles) {
    if (!CHECK_SCRIPT_PATTERN.test(file)) continue;
    if (citedTargets.has(file) || MECHANISMS_OUTSIDE_THE_STANDARDS.has(file)) continue;
    orphans.push({ kind: 'script', target: file });
  }
  for (const gate of GATE_DEFINITIONS) {
    if (!citedTargets.has(gate.name)) orphans.push({ kind: 'gate', target: gate.name });
  }
  return orphans;
}

export function buildLedgerInput(): LedgerInput {
  const repository: Repository = {
    scopesByRule: mapRulesToActiveScopes(),
    registeredCustomRules: readRegisteredCustomRules(),
    invocationSites: listInvocationSites(),
    trackedFiles: listTrackedFiles(),
  };

  const standards = listStandardFiles().map((name) =>
    readStandardCitations(name, readFileSync(join(STANDARDS_DIRECTORY, name), 'utf8')),
  );

  const resolutionsByStandard = new Map<string, readonly ResolvedCitation[]>();
  const citedTargets = new Set<string>();
  for (const standard of standards) {
    resolutionsByStandard.set(
      standard.standard,
      standard.citations.map((citation) =>
        resolveCitation(citation, readMechanismFacts(citation, repository)),
      ),
    );
    for (const citation of standard.citations) citedTargets.add(citation.target);
  }

  return {
    standards,
    resolutionsByStandard,
    orphans: listOrphanMechanisms(repository, citedTargets),
  };
}
