/**
 * Generates `docs/standards/enforcement-ledger.md`, and with `--check` fails
 * when a standard's `## Enforced by` section is not true of this checkout.
 *
 * Whether a rule is enabled is asked of ESLint itself, through
 * `calculateConfigForFile`, rather than by reading `eslint.config.js`. That is
 * the only way to see through the shared presets: `no-explicit-any` is never
 * written in the configuration and is on, while `no-magic-numbers` was cited by
 * a standard and on nowhere. Reading the configuration file gets both backwards.
 *
 * Called by `.husky/pre-commit` and by `ci.yml`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import { readStandardCitations, type Citation } from './citations.core';
import { findGate, GATE_DEFINITIONS } from './gates.core';
import {
  renderLedger,
  resolveCitation,
  selectLedgerProblems,
  type LedgerInput,
  type MechanismFacts,
  type OrphanMechanism,
  type ResolvedCitation,
} from './ledger.core';

const REPOSITORY_ROOT = process.cwd();
const STANDARDS_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'standards');
const LEDGER_PATH = join(STANDARDS_DIRECTORY, 'enforcement-ledger.md');
const HOOKS_DIRECTORY = join(REPOSITORY_ROOT, '.husky');
const WORKFLOWS_DIRECTORY = join(REPOSITORY_ROOT, '.github', 'workflows');
const APPS_DIRECTORY = join(REPOSITORY_ROOT, 'apps');
const OFF_SEVERITIES: ReadonlySet<unknown> = new Set(['off', 0]);
const STANDARD_FILE_PATTERN = /^\d\d-[a-z0-9-]+\.md$/;
/**
 * A gate, wherever it sits under `scripts/` and in either language. Matching
 * only `scripts/check-*.sh` let a gate written in TypeScript, or one moved into
 * a subdirectory, run without any standard explaining it.
 */
const CHECK_SCRIPT_PATTERN = /^scripts\/(?:[a-z0-9-]+\/)*check-[a-z0-9-]+\.(?:sh|ts)$/;

/**
 * A script that guards the conversation rather than the code, so no standard
 * has to claim it.
 */
const MECHANISMS_OUTSIDE_THE_STANDARDS: ReadonlySet<string> = new Set([
  'scripts/check-branch-context.sh',
  'scripts/check-negative-claims-are-dated.sh',
]);

function listStandardFiles(): readonly string[] {
  return readdirSync(STANDARDS_DIRECTORY)
    .filter((name) => STANDARD_FILE_PATTERN.test(name))
    .sort();
}

/** Where an application keeps its front-end source. */
function resolveSiteRoot(app: string): string | null {
  if (existsSync(join(APPS_DIRECTORY, app, 'site', 'src'))) return `apps/${app}/site/src`;
  if (existsSync(join(APPS_DIRECTORY, app, 'site'))) return `apps/${app}/site`;
  return null;
}

interface Probe {
  readonly scope: string;
  readonly path: string;
}

/**
 * One representative path per layer per application, so a rule's reach is read
 * off the layout each application actually has rather than the one the
 * standards describe. The files need not exist; ESLint resolves a configuration
 * for any path inside the project.
 */
function listProbes(): readonly Probe[] {
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

async function mapRulesToActiveScopes(): Promise<ReadonlyMap<string, readonly string[]>> {
  const eslint = new ESLint({ cwd: REPOSITORY_ROOT });
  const scopesByRule = new Map<string, string[]>();
  for (const probe of listProbes()) {
    const configuration = await eslint.calculateConfigForFile(probe.path);
    for (const [ruleName, severity] of Object.entries(configuration.rules ?? {})) {
      const level = Array.isArray(severity) ? severity[0] : severity;
      if (OFF_SEVERITIES.has(level)) continue;
      const scopes = scopesByRule.get(ruleName) ?? [];
      if (!scopes.includes(probe.scope)) scopes.push(probe.scope);
      scopesByRule.set(ruleName, scopes);
    }
  }
  return scopesByRule;
}

function listAllScopes(): readonly string[] {
  const scopes: string[] = [];
  for (const probe of listProbes()) if (!scopes.includes(probe.scope)) scopes.push(probe.scope);
  return scopes;
}

/**
 * A front-end rule that reaches every front end has done its job, so a rule is
 * measured against the applications that have the layer it applies to rather
 * than against every application.
 */
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

function readSiteText(site: string): string {
  const path = join(REPOSITORY_ROOT, site);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function listInvocationSites(): readonly string[] {
  const sites: string[] = [];
  for (const [directory, prefix] of [
    [HOOKS_DIRECTORY, '.husky'],
    [WORKFLOWS_DIRECTORY, '.github/workflows'],
  ] as const) {
    if (!existsSync(directory)) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isFile()) sites.push(`${prefix}/${entry.name}`);
    }
  }
  return sites;
}

function listTrackedFiles(): readonly string[] {
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

/** Which hooks and workflows name this file. */
function selectInvokingSites(repository: Repository, target: string): readonly string[] {
  return repository.invocationSites.filter((site) => readSiteText(site).includes(target));
}

function readMechanismFacts(citation: Citation, repository: Repository): MechanismFacts {
  const everywhere = listAllScopes();
  switch (citation.kind) {
    case 'eslint': {
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
      const activeScopes = gate.sites.filter((site) => readSiteText(site).includes(gate.token));
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
    if (!citedTargets.has(ruleName)) orphans.push({ kind: 'eslint', target: ruleName });
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

async function buildLedgerInput(): Promise<LedgerInput> {
  const repository: Repository = {
    scopesByRule: await mapRulesToActiveScopes(),
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

async function main(): Promise<void> {
  const isCheck = process.argv.includes('--check');
  const input = await buildLedgerInput();
  const rendered = renderLedger(input);
  const problems = selectLedgerProblems(input);

  for (const problem of problems) console.error(`  ${problem.standard}: ${problem.message}`);

  if (isCheck) {
    const onDisk = existsSync(LEDGER_PATH) ? readFileSync(LEDGER_PATH, 'utf8') : '';
    if (onDisk !== rendered) {
      console.error(
        '  docs/standards/enforcement-ledger.md is out of date. Run `pnpm exec tsx scripts/standards/enforcement-ledger.ts`.',
      );
      process.exitCode = 1;
      return;
    }
    if (problems.length > 0) {
      console.error(
        `${String(problems.length)} standard(s) claim enforcement this checkout does not have.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log('Every standard names a mechanism that exists and runs.');
    return;
  }

  writeFileSync(LEDGER_PATH, rendered);
  console.log(`Wrote ${LEDGER_PATH} (${String(problems.length)} problem(s)).`);
  if (problems.length > 0) process.exitCode = 1;
}

await main();
