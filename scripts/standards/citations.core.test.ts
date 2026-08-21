import { describe, expect, it } from 'vitest';
import {
  readCitationFromBullet,
  readEnforcedByBullets,
  readStandardCitations,
  readStandardTitle,
} from './citations.core';

describe('readEnforcedByBullets', () => {
  it('returns nothing when the standard has no enforcement section', () => {
    expect(readEnforcedByBullets('# 00. Principles\n\nSome prose.\n')).toEqual([]);
  });

  it('returns nothing from a standard that has bullets and no enforcement section', () => {
    expect(readEnforcedByBullets('# 01. Naming\n\n- `eslint:borso/x` a rule.\n')).toEqual([]);
  });

  it('reads the bullets when the heading opens the second line of the file', () => {
    expect(readEnforcedByBullets('\n## Enforced by\n\n- `reviewer` kept.\n')).toEqual([
      '`reviewer` kept.',
    ]);
  });

  it('reads the bullets that follow the heading', () => {
    const markdown = '## Enforced by\n\n- `eslint:borso/a` first.\n- `reviewer` second.\n';
    expect(readEnforcedByBullets(markdown)).toEqual([
      '`eslint:borso/a` first.',
      '`reviewer` second.',
    ]);
  });

  it('stops at the next heading', () => {
    const markdown = '## Enforced by\n\n- `reviewer` kept.\n\n## Something else\n\n- dropped.\n';
    expect(readEnforcedByBullets(markdown)).toEqual(['`reviewer` kept.']);
  });

  it('stops at a heading that follows the enforcement heading immediately', () => {
    const markdown = '## Enforced by \n## Something else\n\n- dropped.\n';
    expect(readEnforcedByBullets(markdown)).toEqual([]);
  });

  it('reads the last bullet whole when the file does not end in a newline', () => {
    expect(readEnforcedByBullets('## Enforced by\n\n- `reviewer` kept.')).toEqual([
      '`reviewer` kept.',
    ]);
  });

  it('folds a bullet that wraps across lines into one claim', () => {
    const markdown = '## Enforced by\n\n- `eslint:borso/a` rejects\n  a wrapped thing.\n';
    expect(readEnforcedByBullets(markdown)).toEqual(['`eslint:borso/a` rejects a wrapped thing.']);
  });

  it('ignores a continuation line that precedes any bullet', () => {
    const markdown = '## Enforced by\n\nA stray paragraph.\n\n- `reviewer` kept.\n';
    expect(readEnforcedByBullets(markdown)).toEqual(['`reviewer` kept.']);
  });
});

describe('readCitationFromBullet', () => {
  it('reads a rule citation', () => {
    expect(readCitationFromBullet('`eslint:borso/no-use-effect` rejects effects.')).toEqual({
      kind: 'eslint',
      target: 'borso/no-use-effect',
      bullet: '`eslint:borso/no-use-effect` rejects effects.',
    });
  });

  it.each([
    ['script', 'scripts/check-pwa-assets.sh'],
    ['generator', 'scripts/architecture/architecture-graph.ts'],
    ['gate', 'stryker'],
    ['types', 'react-i18next.d.ts'],
    ['test', 'i18n-parity.core.test.ts'],
  ])('reads a %s citation', (kind, target) => {
    const citation = readCitationFromBullet(`\`${kind}:${target}\` does a thing.`);
    expect(citation).toMatchObject({ kind, target });
  });

  it('reads a reviewer citation, which names no target', () => {
    expect(readCitationFromBullet('`reviewer` checks the name.')).toEqual({
      kind: 'reviewer',
      target: '',
      bullet: '`reviewer` checks the name.',
    });
  });

  it('returns null for a bullet that opens with prose', () => {
    expect(readCitationFromBullet('The pre-commit hook, which runs `eslint`.')).toBeNull();
  });

  it('returns null for a marker whose kind is not in the vocabulary', () => {
    expect(readCitationFromBullet('`vibes:borso/no-use-effect` feels right.')).toBeNull();
  });

  it('reads only the marker the bullet opens with', () => {
    const citation = readCitationFromBullet('`eslint:borso/a` and also `eslint:borso/b`.');
    expect(citation?.target).toBe('borso/a');
  });

  it('trims a target padded inside the marker', () => {
    expect(readCitationFromBullet('`gate: stryker ` runs.')?.target).toBe('stryker');
  });

  it('returns null for a kind that names no target', () => {
    expect(readCitationFromBullet('`eslint` on its own.')).toBeNull();
  });

  it('returns null for a target that is only whitespace', () => {
    expect(readCitationFromBullet('`eslint: ` on its own.')).toBeNull();
  });

  it('ignores a target written after a reviewer marker, which names nobody', () => {
    expect(readCitationFromBullet('`reviewer:someone` checks it.')).toMatchObject({
      kind: 'reviewer',
      target: '',
    });
  });
});

describe('readStandardTitle', () => {
  it('reads the first heading', () => {
    expect(readStandardTitle('# 01. Naming\n\nprose', '01-naming.md')).toBe('01. Naming');
  });

  it('trims a heading padded at the end of its line', () => {
    expect(readStandardTitle('# 01. Naming   \n\nprose', '01-naming.md')).toBe('01. Naming');
  });

  it('falls back to the file name when the document has no title', () => {
    expect(readStandardTitle('prose only', '01-naming.md')).toBe('01-naming.md');
  });
});

describe('readStandardCitations', () => {
  it('separates marked bullets from unmarked ones', () => {
    const markdown = [
      '# 05. Front end',
      '',
      '## Enforced by',
      '',
      '- `eslint:borso/no-use-effect` rejects effects.',
      '- `reviewer` checks the layout at 375 pixels.',
      '- The agentic browser check, which nothing invokes.',
      '',
    ].join('\n');

    const read = readStandardCitations('05-frontend-architecture.md', markdown);

    expect(read.title).toBe('05. Front end');
    expect(read.citations.map((citation) => citation.kind)).toEqual(['eslint', 'reviewer']);
    expect(read.unmarkedBullets).toEqual(['The agentic browser check, which nothing invokes.']);
  });

  it('reads a standard with no enforcement section as empty', () => {
    const read = readStandardCitations('00-principles.md', '# 00. Principles\n');
    expect(read.citations).toEqual([]);
    expect(read.unmarkedBullets).toEqual([]);
  });
});
