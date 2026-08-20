#!/usr/bin/env tsx

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import { readEradicationSection, renderProvenanceReport, type RuleRecord } from './provenance.core';

const REPOSITORY_ROOT = process.cwd();
const DANTOTSUS_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'dantotsus');
const STANDARDS_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'standards');
const REPORT_PATH = join(STANDARDS_DIRECTORY, 'rule-provenance.md');
const NON_DANTOTSU_FILES = new Set(['README.md', '_template.md']);
const STANDARD_FILE_PATTERN = /^\d\d-[a-z0-9-]+\.md$/;
const OFF_SEVERITIES: ReadonlySet<unknown> = new Set(['off', 0]);

const PROBE_PATHS: readonly string[] = [
  'apps/pragma/api/src/probe/probe.controller.ts',
  'apps/pragma/api/src/probe/probe.service.ts',
  'apps/pragma/api/src/probe/probe.repository.ts',
  'apps/pragma/api/src/probe/probe.core.ts',
  'apps/pragma/api/src/probe/probe.adapter.ts',
  'apps/pragma/site/src/components/atoms/Probe.tsx',
  'apps/pragma/site/src/components/molecules/Probe.tsx',
  'apps/pragma/site/src/components/organisms/Probe.tsx',
  'apps/pragma/site/src/routes/Probe.tsx',
  'apps/pragma/site/src/lib/probe.utils.ts',
  'apps/pragma/domain/probe.core.ts',
  'infra/cdk/src/probe.ts',
  'eslint-rules/probe.js',
];

function readRegisteredRules(): readonly string[] {
  const indexSource = readFileSync(join(REPOSITORY_ROOT, 'eslint-rules', 'index.js'), 'utf8');
  const registered: string[] = [];
  for (const match of indexSource.matchAll(/^\s*'([a-z0-9-]+)':/gm)) {
    const ruleName = match[1];
    if (ruleName !== undefined) registered.push(`borso/${ruleName}`);
  }
  return registered.sort();
}

async function readEnabledRules(): Promise<ReadonlySet<string>> {
  const eslint = new ESLint({ cwd: REPOSITORY_ROOT });
  const enabled = new Set<string>();
  for (const path of PROBE_PATHS) {
    const configuration = await eslint.calculateConfigForFile(path);
    for (const [ruleName, severity] of Object.entries(configuration.rules ?? {})) {
      const level = Array.isArray(severity) ? severity[0] : severity;
      if (!OFF_SEVERITIES.has(level)) enabled.add(ruleName);
    }
  }
  return enabled;
}

interface Corpus {
  readonly dantotsus: ReadonlyMap<string, string>;
  readonly standards: ReadonlyMap<string, string>;
}

function readCorpus(): Corpus {
  const dantotsus = new Map<string, string>();
  for (const name of readdirSync(DANTOTSUS_DIRECTORY).sort()) {
    if (!name.endsWith('.md') || NON_DANTOTSU_FILES.has(name)) continue;
    dantotsus.set(
      name.replace(/\.md$/, ''),
      readEradicationSection(readFileSync(join(DANTOTSUS_DIRECTORY, name), 'utf8')),
    );
  }
  const standards = new Map<string, string>();
  for (const name of readdirSync(STANDARDS_DIRECTORY).sort()) {
    if (!STANDARD_FILE_PATTERN.test(name)) continue;
    standards.set(name, readFileSync(join(STANDARDS_DIRECTORY, name), 'utf8'));
  }
  return { dantotsus, standards };
}

function listMentions(corpus: ReadonlyMap<string, string>, rule: string): readonly string[] {
  const bareName = rule.replace('borso/', '');
  const found: string[] = [];
  for (const [key, contents] of corpus) {
    if (contents.includes(rule) || contents.includes(bareName)) found.push(key);
  }
  return found;
}

async function buildRecords(): Promise<readonly RuleRecord[]> {
  const corpus = readCorpus();
  const enabled = await readEnabledRules();
  return readRegisteredRules().map((rule) => ({
    rule,
    dantotsuSlugs: listMentions(corpus.dantotsus, rule),
    citingStandards: listMentions(corpus.standards, rule),
    enabled: enabled.has(rule),
  }));
}

async function main(): Promise<void> {
  const records = await buildRecords();
  const dantotsuCount = readCorpus().dantotsus.size;
  const rendered = renderProvenanceReport(records, dantotsuCount);

  writeFileSync(REPORT_PATH, rendered);
  const fromDefect = records.filter((record) => record.dantotsuSlugs.length > 0).length;
  console.log(
    `Wrote docs/standards/rule-provenance.md: ${String(fromDefect)} of ${String(records.length)} rule(s) came from a defect.`,
  );
}

await main();
