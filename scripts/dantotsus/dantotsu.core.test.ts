import { describe, expect, it } from 'vitest';
import {
  countByKind,
  countWhySteps,
  driftAboveBaseline,
  hasEradicationDiff,
  hasEradicationReference,
  LIMITS,
  parseEntry,
  TITLE_LIMIT,
  WHOLE_LIMIT,
  readFrontmatter,
  readSections,
  validateEntry,
  WHY_STEPS_MAX,
  WHY_STEPS_MIN,
  type Finding,
} from './dantotsu.core';
import { countable } from '../pr/pr-body.core';

function entryText(overrides: Partial<Record<string, string>> = {}): string {
  const frontmatter = {
    date: '2026-09-16',
    'introduced-at': 'implementation',
    'detected-at': 'ci',
    severity: 'medium',
    'eradication-level': '2',
    ...overrides,
  };
  const fields = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n');
  return [
    '---',
    fields,
    '---',
    '',
    '# A title that names the lesson',
    '',
    '## Symptom',
    '',
    'The build went red.',
    '',
    '## Root-cause chain',
    '',
    '1. **Why?** Because one.',
    '2. **Why?** Because two.',
    '3. **Why?** Because three.',
    '',
    '## Detection failure causes',
    '',
    '- **Typing:** nothing to see.',
    '',
    '## Countermeasure',
    '',
    'Commit `abc1234` fixed it.',
    '',
    '## Eradication',
    '',
    'Reference: commit `abc1234`.',
    '',
    '```diff',
    '- old',
    '+ new',
    '```',
    '',
  ].join('\n');
}

function findingsFor(source: string): readonly Finding[] {
  return validateEntry(parseEntry('an-entry', source));
}

function long(size: number): string {
  return 'a'.repeat(size);
}

describe('readFrontmatter', () => {
  it('reads each field of the block', () => {
    const fields = readFrontmatter('---\ndate: 2026-01-01\nseverity: low\n---\n# T\n');
    expect(fields.get('date')).toBe('2026-01-01');
    expect(fields.get('severity')).toBe('low');
  });

  it('reads nothing from a document with no block', () => {
    expect([...readFrontmatter('# T\n').keys()]).toEqual([]);
  });

  it('ignores a line that is not a field', () => {
    expect([...readFrontmatter('---\nnot a field\ndate: 2026-01-01\n---\n').keys()]).toEqual([
      'date',
    ]);
  });

  it('ignores a line carrying no colon at all', () => {
    expect([...readFrontmatter('---\nnocolonhere\ndate: 2026-01-01\n---\n').keys()]).toEqual([
      'date',
    ]);
  });

  it('ignores a key that is not a field name', () => {
    expect([...readFrontmatter('---\nSome Text: a value\ndate: 2026-01-01\n---\n').keys()]).toEqual(
      ['date'],
    );
  });

  it('reads nothing from a document whose first line is not the rule', () => {
    expect([...readFrontmatter('# A title\ndate: 2026-01-01\n').keys()]).toEqual([]);
  });

  it('stops at the closing rule rather than reading the whole document', () => {
    expect([...readFrontmatter('---\ndate: 2026-01-01\n---\nseverity: low\n').keys()]).toEqual([
      'date',
    ]);
  });
});

describe('readSections', () => {
  it('splits on the second-level headings and trims the names', () => {
    const sections = readSections('# T\n\n## Symptom \n\nbody\n\n## Countermeasure\n\nmore\n');
    expect([...sections.keys()]).toEqual(['Symptom', 'Countermeasure']);
    expect(sections.get('Symptom')).toContain('body');
  });

  it('drops the mandatory suffix the template carries', () => {
    const sections = readSections('## Eradication (mandatory — code-level)\n\nbody\n');
    expect([...sections.keys()]).toEqual(['Eradication']);
  });

  it('reads a heading with nothing under it', () => {
    expect(readSections('## Symptom').get('Symptom')).toBe('');
  });
});

describe('parseEntry', () => {
  it('reads the title', () => {
    expect(parseEntry('n', entryText()).title).toBe('A title that names the lesson');
  });

  it('answers an empty title when the document has no heading', () => {
    expect(parseEntry('n', 'no heading').title).toBe('');
  });
});

describe('countWhySteps', () => {
  it('counts an ordered list however each step is worded', () => {
    expect(countWhySteps('1. **Why?** a\n2. plain step\n3. **Why?** c\n')).toBe(3);
  });

  it('counts nothing in prose', () => {
    expect(countWhySteps('a paragraph')).toBe(0);
  });
});

describe('hasEradicationReference and hasEradicationDiff', () => {
  it('finds a short commit hash and a fenced block', () => {
    expect(hasEradicationReference('commit `abc1234` landed it')).toBe(true);
    expect(hasEradicationDiff('```diff\n- a\n```')).toBe(true);
  });

  it('finds neither in a vague pointer', () => {
    expect(hasEradicationReference('fixed on the kaizen branch')).toBe(false);
    expect(hasEradicationDiff('described in prose')).toBe(false);
  });
});

describe('validateEntry', () => {
  it('passes a well-formed entry', () => {
    expect(findingsFor(entryText())).toEqual([]);
  });

  it('refuses a date that is not a date', () => {
    expect(findingsFor(entryText({ date: 'last tuesday' }))).toContainEqual({
      entry: 'an-entry',
      kind: 'frontmatter',
      problem: 'date is not a YYYY-MM-DD date',
    });
  });

  it('refuses an eradication level outside one to five', () => {
    expect(findingsFor(entryText({ 'eradication-level': '9' }))).toContainEqual({
      entry: 'an-entry',
      kind: 'frontmatter',
      problem: 'eradication-level is not a number from 1 to 5',
    });
  });

  it('refuses a stage nobody agreed to', () => {
    const findings = findingsFor(entryText({ 'introduced-at': 'parallelisation' }));
    expect(findings[0]?.problem).toContain('introduced-at must be one of');
  });

  it('refuses a detection layer nobody agreed to', () => {
    const findings = findingsFor(entryText({ 'detected-at': 'the-first-parallel-push' }));
    expect(findings[0]?.problem).toContain('detected-at must be one of');
  });

  it('refuses a severity nobody agreed to', () => {
    const findings = findingsFor(entryText({ severity: 'catastrophic' }));
    expect(findings[0]?.problem).toContain('severity must be one of');
  });

  it('refuses a field still holding the template placeholder', () => {
    expect(findingsFor(entryText({ 'fix-pr': '<#n or url>' }))).toContainEqual({
      entry: 'an-entry',
      kind: 'placeholder',
      problem: 'fix-pr still holds the template placeholder',
    });
  });

  it('says nothing about a chain an entry has no section for', () => {
    const noChain = entryText().replace('## Root-cause chain', '## Root cause');
    const findings = findingsFor(noChain);
    expect(findings.some((finding) => finding.kind === 'why-steps')).toBe(false);
  });

  it('refuses a missing section by name', () => {
    const withoutSymptom = entryText().replace('## Symptom', '## Something else');
    expect(findingsFor(withoutSymptom)).toContainEqual({
      entry: 'an-entry',
      kind: 'missing-section',
      problem: 'no section named Symptom',
    });
  });

  it('refuses a chain too short to be a chain', () => {
    const shortChain = entryText().replace('3. **Why?** Because three.\n', '');
    expect(findingsFor(shortChain)).toContainEqual({
      entry: 'an-entry',
      kind: 'why-steps',
      problem: '2 why steps, expected 3 to 7',
    });
  });

  it('refuses a chain longer than the method', () => {
    const steps = Array.from(
      { length: WHY_STEPS_MAX + 1 },
      (_unused, index) => `${String(index + 1)}. **Why?** step`,
    ).join('\n');
    const longChain = entryText().replace(
      '1. **Why?** Because one.\n2. **Why?** Because two.\n3. **Why?** Because three.',
      steps,
    );
    const findings = findingsFor(longChain);
    expect(findings.some((finding) => finding.kind === 'why-steps')).toBe(true);
  });

  it('refuses an eradication with no fenced block', () => {
    const noDiff = entryText().replace('```diff\n- old\n+ new\n```\n', '');
    expect(findingsFor(noDiff)).toContainEqual({
      entry: 'an-entry',
      kind: 'eradication-diff',
      problem: 'Eradication carries no fenced block',
    });
  });

  it('refuses a title over the limit', () => {
    const wide = entryText().replace('A title that names the lesson', long(TITLE_LIMIT + 1));
    const findings = findingsFor(wide);
    expect(findings.some((finding) => finding.kind === 'size:title')).toBe(true);
  });

  it('accepts a title of exactly the limit', () => {
    const wide = entryText().replace('A title that names the lesson', long(TITLE_LIMIT));
    expect(findingsFor(wide)).toEqual([]);
  });

  it('refuses a section over its own limit, naming the section and both numbers', () => {
    const wide = entryText().replace('The build went red.', long(LIMITS.Symptom + 1));
    expect(findingsFor(wide)).toContainEqual({
      entry: 'an-entry',
      kind: 'size:Symptom',
      problem: `Symptom is ${String(LIMITS.Symptom + 1)} countable chars, limit ${String(LIMITS.Symptom)}`,
    });
  });

  it('accepts a section of exactly its limit', () => {
    const wide = entryText().replace('The build went red.', long(LIMITS.Symptom));
    expect(findingsFor(wide)).toEqual([]);
  });

  it('refuses a whole entry over the limit even when each section fits', () => {
    const wide = entryText()
      .replace('The build went red.', long(LIMITS.Symptom))
      .replace('1. **Why?** Because one.', `1. **Why?** ${long(LIMITS['Root-cause chain'] - 50)}`)
      .replace('- **Typing:** nothing to see.', long(LIMITS['Detection failure causes']))
      .replace('Commit `abc1234` fixed it.', long(LIMITS.Countermeasure))
      .replace('Reference: commit `abc1234`.', `abc1234 ${long(LIMITS.Eradication - 50)}`);
    const findings = findingsFor(wide);
    expect(findings.some((finding) => finding.kind === 'size:whole')).toBe(true);
    expect(findings.every((finding) => finding.kind === 'size:whole')).toBe(true);
  });

  it('says nothing about a section the entry does not carry', () => {
    const findings = findingsFor(entryText());
    expect(findings.some((finding) => finding.kind === 'size:See also')).toBe(false);
  });
});

describe('countByKind', () => {
  it('counts one row per class', () => {
    const findings: Finding[] = [
      { entry: 'a', kind: 'placeholder', problem: 'x' },
      { entry: 'b', kind: 'placeholder', problem: 'y' },
      { entry: 'c', kind: 'why-steps', problem: 'z' },
    ];
    expect([...countByKind(findings)]).toEqual([
      ['placeholder', 2],
      ['why-steps', 1],
    ]);
  });

  it('counts nothing for no findings', () => {
    expect([...countByKind([])]).toEqual([]);
  });
});

describe('driftAboveBaseline', () => {
  it('reports a class that grew past what was accepted', () => {
    const drift = driftAboveBaseline(new Map([['placeholder', 3]]), new Map([['placeholder', 2]]));
    expect(drift).toEqual([
      {
        entry: 'docs/dantotsus',
        kind: 'placeholder',
        problem: '3 entries over on placeholder, baseline 2',
      },
    ]);
  });

  it('reports a class the baseline never mentioned', () => {
    const drift = driftAboveBaseline(new Map([['why-steps', 1]]), new Map());
    expect(drift[0]?.problem).toBe('1 entries over on why-steps, baseline 0');
  });

  it('says nothing when a class held steady or shrank', () => {
    const counts = new Map([
      ['placeholder', 2],
      ['why-steps', 0],
    ]);
    expect(driftAboveBaseline(counts, new Map([['placeholder', 2]]))).toEqual([]);
  });

  it('reports the classes in a stable order', () => {
    const counts = new Map([
      ['why-steps', 1],
      ['placeholder', 1],
    ]);
    expect(driftAboveBaseline(counts, new Map()).map((finding) => finding.kind)).toEqual([
      'placeholder',
      'why-steps',
    ]);
  });
});

describe('the details a careless edit would change', () => {
  it('trims a frontmatter value written with trailing spaces', () => {
    expect(readFrontmatter('---\ndate: 2026-01-01   \n---\n').get('date')).toBe('2026-01-01');
  });

  it('trims a title written with trailing spaces', () => {
    expect(parseEntry('n', '# A title   \n').title).toBe('A title');
  });

  it('reads a heading only at the start of a line', () => {
    const sections = readSections('## Symptom\n\nthe log said ## Countermeasure was skipped\n');
    expect([...sections.keys()]).toEqual(['Symptom']);
  });

  it('reads a heading whose name is empty', () => {
    expect([...readSections('## \nbody\n').keys()]).toEqual(['']);
  });

  it('names the class and lists the allowed values in full', () => {
    expect(findingsFor(entryText({ severity: 'catastrophic' }))).toContainEqual({
      entry: 'an-entry',
      kind: 'frontmatter',
      problem: 'severity must be one of low, medium, high',
    });
  });

  it('refuses a level that merely starts or ends with a digit in range', () => {
    expect(findingsFor(entryText({ 'eradication-level': '12' }))).toContainEqual({
      entry: 'an-entry',
      kind: 'frontmatter',
      problem: 'eradication-level is not a number from 1 to 5',
    });
    expect(findingsFor(entryText({ 'eradication-level': 'a3' }))).toContainEqual({
      entry: 'an-entry',
      kind: 'frontmatter',
      problem: 'eradication-level is not a number from 1 to 5',
    });
  });

  it('refuses every frontmatter field an entry simply omits', () => {
    const bare = entryText().replace(/^---\n[\s\S]*?\n---\n/, '');
    const problems = findingsFor(bare)
      .filter((finding) => finding.kind === 'frontmatter')
      .map((finding) => finding.problem);
    expect(problems).toEqual([
      'date is missing',
      'eradication-level is missing',
      'introduced-at is missing',
      'detected-at is missing',
      'severity is missing',
    ]);
  });

  it('refuses a date that merely contains one', () => {
    expect(findingsFor(entryText({ date: 'on 2026-01-01 exactly' }))).toContainEqual({
      entry: 'an-entry',
      kind: 'frontmatter',
      problem: 'date is not a YYYY-MM-DD date',
    });
  });

  it('accepts a chain of exactly the shortest and the longest allowed', () => {
    for (const steps of [WHY_STEPS_MIN, WHY_STEPS_MAX]) {
      const chain = Array.from(
        { length: steps },
        (_unused, index) => `${String(index + 1)}. **Why?** step`,
      ).join('\n');
      const text = entryText().replace(
        '1. **Why?** Because one.\n2. **Why?** Because two.\n3. **Why?** Because three.',
        chain,
      );
      expect(findingsFor(text)).toEqual([]);
    }
  });
});

describe('the boundaries and the exact words', () => {
  it('names the whole-entry size and its limit', () => {
    const wide = entryText().replace('The build went red.', long(WHOLE_LIMIT));
    expect(findingsFor(wide)).toContainEqual({
      entry: 'an-entry',
      kind: 'size:whole',
      problem: `${String(countable(wide))} countable chars, limit ${String(WHOLE_LIMIT)}`,
    });
  });

  it('names the title size and its limit', () => {
    const wide = entryText().replace('A title that names the lesson', long(TITLE_LIMIT + 1));
    expect(findingsFor(wide)).toContainEqual({
      entry: 'an-entry',
      kind: 'size:title',
      problem: `title is ${String(TITLE_LIMIT + 1)} countable chars, limit ${String(TITLE_LIMIT)}`,
    });
  });

  it('accepts a whole entry of exactly the limit', () => {
    const base = entryText();
    const padded = base.replace('The build went red.', long(WHOLE_LIMIT - countable(base) + 15));
    expect(countable(padded)).toBe(WHOLE_LIMIT);
    expect(findingsFor(padded).some((finding) => finding.kind === 'size:whole')).toBe(false);
  });

  it('keeps the body of a heading that sits at the very start of its part', () => {
    expect(readSections('## \nbody\n').get('')).toBe('body\n');
  });

  it('says nothing about a fenced block when the entry has no Eradication at all', () => {
    const noEradication = entryText().replace('## Eradication', '## Afterword');
    const findings = findingsFor(noEradication);
    expect(findings.some((finding) => finding.kind === 'eradication-diff')).toBe(false);
    expect(findings.some((finding) => finding.kind === 'missing-section')).toBe(true);
  });
});
