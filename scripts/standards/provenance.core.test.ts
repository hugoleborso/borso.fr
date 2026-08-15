import { describe, expect, it } from 'vitest';
import {
  rankRecords,
  readEradicationSection,
  readProvenance,
  renderProvenanceReport,
  summariseProvenance,
  type RuleRecord,
} from './provenance.core';

function buildRecord(overrides: Partial<RuleRecord> = {}): RuleRecord {
  return {
    rule: 'borso/no-use-effect',
    dantotsuSlugs: [],
    citingStandards: ['07-state-and-effects.md'],
    enabled: true,
    ...overrides,
  };
}

describe('readEradicationSection', () => {
  it('reads only the eradication section, stopping at the next heading', () => {
    const markdown = [
      '# A title',
      '',
      '## Symptom',
      '',
      'names borso/a',
      '',
      '## Eradication',
      '',
      'ships borso/b',
      '',
      '## What to check next time',
      '',
      'names borso/c',
      '',
    ].join('\n');
    const section = readEradicationSection(markdown);
    expect(section).toContain('borso/b');
    expect(section).not.toContain('borso/a');
    expect(section).not.toContain('borso/c');
  });

  it('reads to the end when the eradication section is last', () => {
    expect(readEradicationSection('## Eradication\n\nships borso/b\n')).toContain('borso/b');
  });

  it('reads nothing from a dantotsu with no eradication section', () => {
    expect(readEradicationSection('# A title\n\n## Symptom\n\nprose\n')).toBe('');
  });
});

describe('readProvenance', () => {
  it('reads a rule an eradication names as coming from a defect', () => {
    expect(readProvenance(buildRecord({ dantotsuSlugs: ['a-slug'] }))).toBe('from-a-defect');
  });

  it('reads a rule no eradication names as coming from principle', () => {
    expect(readProvenance(buildRecord())).toBe('from-principle');
  });
});

describe('summariseProvenance', () => {
  it('counts both origins', () => {
    const summary = summariseProvenance([
      buildRecord({ rule: 'borso/a', dantotsuSlugs: ['x'] }),
      buildRecord({ rule: 'borso/b' }),
    ]);
    expect(summary.fromDefect).toBe(1);
    expect(summary.fromPrinciple).toBe(1);
  });

  it('names a rule no standard cites', () => {
    const summary = summariseProvenance([buildRecord({ rule: 'borso/a', citingStandards: [] })]);
    expect(summary.uncited).toEqual(['borso/a']);
  });

  it('names a rule that is registered and running nowhere', () => {
    const summary = summariseProvenance([buildRecord({ rule: 'borso/a', enabled: false })]);
    expect(summary.disabled).toEqual(['borso/a']);
  });
});

describe('rankRecords', () => {
  it('puts the rules with the most evidence first', () => {
    const ranked = rankRecords([
      buildRecord({ rule: 'borso/thin', dantotsuSlugs: ['x'] }),
      buildRecord({ rule: 'borso/thick', dantotsuSlugs: ['x', 'y'] }),
    ]);
    expect(ranked.map((record) => record.rule)).toEqual(['borso/thick', 'borso/thin']);
  });

  it('orders equal evidence by rule name, so the page is stable', () => {
    const ranked = rankRecords([
      buildRecord({ rule: 'borso/zebra' }),
      buildRecord({ rule: 'borso/alpha' }),
    ]);
    expect(ranked.map((record) => record.rule)).toEqual(['borso/alpha', 'borso/zebra']);
  });
});

describe('renderProvenanceReport', () => {
  it('says the page is not a verdict, because it is not one', () => {
    const rendered = renderProvenanceReport([buildRecord()], 79);
    expect(rendered).toContain('**Neither is a verdict.**');
    expect(rendered).toContain('Do not delete a rule because this');
  });

  it('counts what it read', () => {
    expect(renderProvenanceReport([buildRecord()], 79)).toContain(
      '1 rule(s), read against 79 dantotsu(s).',
    );
  });

  it('links a rule to the dantotsu that shipped it', () => {
    const rendered = renderProvenanceReport(
      [buildRecord({ rule: 'borso/a', dantotsuSlugs: ['a-slug'] })],
      79,
    );
    expect(rendered).toContain('| `borso/a` | a defect | [a-slug](../dantotsus/a-slug.md) |');
  });

  it('marks a rule with no eradication behind it as written from principle', () => {
    expect(renderProvenanceReport([buildRecord({ rule: 'borso/a' })], 79)).toContain(
      '| `borso/a` | principle | — |',
    );
  });

  it('reports a rule no standard cites', () => {
    const rendered = renderProvenanceReport(
      [buildRecord({ rule: 'borso/a', citingStandards: [] })],
      79,
    );
    expect(rendered).toContain('1 rule(s) no standard cites');
  });

  it('reports a rule that runs nowhere', () => {
    const rendered = renderProvenanceReport([buildRecord({ rule: 'borso/a', enabled: false })], 79);
    expect(rendered).toContain('1 rule(s) registered and enabled nowhere');
  });

  it('says nothing about uncited or disabled rules when there are none', () => {
    const rendered = renderProvenanceReport([buildRecord()], 79);
    expect(rendered).not.toContain('no standard cites');
    expect(rendered).not.toContain('enabled nowhere');
  });
});
