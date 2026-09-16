import { countable } from '../pr/pr-body.core';

export const TITLE_LIMIT = 72;
export const WHOLE_LIMIT = 3_000;

export interface SectionLimits {
  readonly Symptom: number;
  readonly 'Root-cause chain': number;
  readonly 'Detection failure causes': number;
  readonly Countermeasure: number;
  readonly Eradication: number;
  readonly 'See also': number;
}

export const LIMITS: SectionLimits = {
  Symptom: 400,
  'Root-cause chain': 900,
  'Detection failure causes': 700,
  Countermeasure: 300,
  Eradication: 1_000,
  'See also': 250,
};

export const WHY_STEPS_MIN = 3;
export const WHY_STEPS_MAX = 7;

export const REQUIRED_SECTIONS = [
  'Symptom',
  'Root-cause chain',
  'Detection failure causes',
  'Countermeasure',
  'Eradication',
] as const;

export const STAGES = ['conception', 'implementation', 'self-validation', 'code-review'] as const;
export const LAYERS = [
  'typing',
  'linter',
  'local',
  'implementation',
  'measurement',
  'ci',
  'review',
  'qa',
  'staging',
  'production',
  'operator-deploy',
  'post-merge',
] as const;
export const SEVERITIES = ['low', 'medium', 'high'] as const;

export interface Finding {
  readonly entry: string;
  readonly kind: string;
  readonly problem: string;
}

export interface Entry {
  readonly name: string;
  readonly frontmatter: ReadonlyMap<string, string>;
  readonly title: string;
  readonly sections: ReadonlyMap<string, string>;
  readonly body: string;
}

const FENCE_RULE = '---';
const FIELD_NAME = /^[a-z-]+$/;
const NOT_FOUND = -1;
const TITLE_PREFIX = '# ';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ERADICATION_LEVEL = /^[1-5]$/;
const PLACEHOLDER = /<[^>]+>/;
const COMMIT_REFERENCE = /\b[0-9a-f]{7,40}\b/;
const FENCE = /```/;
const WHY_STEP = /^\d+\.\s/gm;
const SECTION_SUFFIX = / \(mandatory — code-level\)$/;

export function readFrontmatter(source: string): ReadonlyMap<string, string> {
  const fields = new Map<string, string>();
  const lines = source.split('\n');
  if (lines[0] !== FENCE_RULE) return fields;
  for (const line of lines.slice(1)) {
    if (line === FENCE_RULE) break;
    const separator = line.indexOf(':');
    if (separator === NOT_FOUND) continue;
    const field = line.slice(0, separator);
    if (!FIELD_NAME.test(field)) continue;
    fields.set(field, line.slice(separator + 1).trim());
  }
  return fields;
}

export function readSections(source: string): ReadonlyMap<string, string> {
  const sections = new Map<string, string>();
  const parts = source.split(/^## /m);
  for (const part of parts.slice(1)) {
    const newline = part.indexOf('\n');
    const name = (newline < 0 ? part : part.slice(0, newline)).trim().replace(SECTION_SUFFIX, '');
    sections.set(name, newline < 0 ? '' : part.slice(newline + 1));
  }
  return sections;
}

export function parseEntry(name: string, source: string): Entry {
  const title = source.split('\n').find((line) => line.startsWith(TITLE_PREFIX)) ?? '';
  return {
    name,
    frontmatter: readFrontmatter(source),
    title: title.slice(TITLE_PREFIX.length).trim(),
    sections: readSections(source),
    body: source,
  };
}

export function countWhySteps(chain: string): number {
  return (chain.match(WHY_STEP) ?? []).length;
}

export function hasEradicationReference(eradication: string): boolean {
  return COMMIT_REFERENCE.test(eradication);
}

export function hasEradicationDiff(eradication: string): boolean {
  return FENCE.test(eradication);
}

function checkField(
  entry: Entry,
  field: string,
  isValid: (value: string) => boolean,
  expectation: string,
  findings: Finding[],
): void {
  const value = entry.frontmatter.get(field);
  if (value === undefined) {
    findings.push({ entry: entry.name, kind: 'frontmatter', problem: `${field} is missing` });
    return;
  }
  if (!isValid(value)) {
    findings.push({ entry: entry.name, kind: 'frontmatter', problem: `${field} ${expectation}` });
  }
}

function checkFrontmatter(entry: Entry, findings: Finding[]): void {
  checkField(entry, 'date', (value) => DATE.test(value), 'is not a YYYY-MM-DD date', findings);
  checkField(
    entry,
    'eradication-level',
    (value) => ERADICATION_LEVEL.test(value),
    'is not a number from 1 to 5',
    findings,
  );
  const enums: readonly (readonly [string, readonly string[]])[] = [
    ['introduced-at', STAGES],
    ['detected-at', LAYERS],
    ['severity', SEVERITIES],
  ];
  for (const [field, allowed] of enums) {
    checkField(
      entry,
      field,
      (value) => allowed.includes(value),
      `must be one of ${allowed.join(', ')}`,
      findings,
    );
  }
  for (const [field, value] of entry.frontmatter) {
    if (PLACEHOLDER.test(value)) {
      findings.push({
        entry: entry.name,
        kind: 'placeholder',
        problem: `${field} still holds the template placeholder`,
      });
    }
  }
}

function checkSections(entry: Entry, findings: Finding[]): void {
  for (const required of REQUIRED_SECTIONS) {
    if (!entry.sections.has(required)) {
      findings.push({
        entry: entry.name,
        kind: 'missing-section',
        problem: `no section named ${required}`,
      });
    }
  }
  const chain = entry.sections.get('Root-cause chain');
  if (chain !== undefined) {
    const steps = countWhySteps(chain);
    if (steps < WHY_STEPS_MIN || steps > WHY_STEPS_MAX) {
      findings.push({
        entry: entry.name,
        kind: 'why-steps',
        problem: `${String(steps)} why steps, expected ${String(WHY_STEPS_MIN)} to ${String(WHY_STEPS_MAX)}`,
      });
    }
  }
  const eradication = entry.sections.get('Eradication');
  if (eradication !== undefined && !hasEradicationDiff(eradication)) {
    findings.push({
      entry: entry.name,
      kind: 'eradication-diff',
      problem: 'Eradication carries no fenced block',
    });
  }
}

function checkBudget(entry: Entry, findings: Finding[]): void {
  const whole = countable(entry.body);
  if (whole > WHOLE_LIMIT) {
    findings.push({
      entry: entry.name,
      kind: 'size:whole',
      problem: `${String(whole)} countable chars, limit ${String(WHOLE_LIMIT)}`,
    });
  }
  const titleSize = countable(entry.title);
  if (titleSize > TITLE_LIMIT) {
    findings.push({
      entry: entry.name,
      kind: 'size:title',
      problem: `title is ${String(titleSize)} countable chars, limit ${String(TITLE_LIMIT)}`,
    });
  }
  for (const [name, limit] of Object.entries(LIMITS)) {
    const section = entry.sections.get(name);
    if (section === undefined) continue;
    const size = countable(section);
    if (size > limit) {
      findings.push({
        entry: entry.name,
        kind: `size:${name}`,
        problem: `${name} is ${String(size)} countable chars, limit ${String(limit)}`,
      });
    }
  }
}

export function validateEntry(entry: Entry): readonly Finding[] {
  const findings: Finding[] = [];
  checkFrontmatter(entry, findings);
  checkSections(entry, findings);
  checkBudget(entry, findings);
  return findings;
}

export function countByKind(findings: readonly Finding[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.kind, (counts.get(finding.kind) ?? 0) + 1);
  }
  return counts;
}

export function driftAboveBaseline(
  counts: ReadonlyMap<string, number>,
  baseline: ReadonlyMap<string, number>,
): readonly Finding[] {
  const drift: Finding[] = [];
  for (const [kind, counted] of [...counts].sort()) {
    const accepted = baseline.get(kind) ?? 0;
    if (counted > accepted) {
      drift.push({
        entry: 'docs/dantotsus',
        kind,
        problem: `${String(counted)} entries over on ${kind}, baseline ${String(accepted)}`,
      });
    }
  }
  return drift;
}
