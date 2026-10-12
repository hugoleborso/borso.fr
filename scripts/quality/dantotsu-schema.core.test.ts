import { describe, expect, it } from 'vitest';
import { readDantotsuDocument, type DantotsuDocument } from './dantotsu-record.core';
import { resolveCommit, selectSchemaProblems, type SchemaFacts } from './dantotsu-schema.core';

const MAIN_COMMIT = 'abc1234def5678';
const OTHER_COMMIT = 'abd9999000aaaa';
const FACTS: SchemaFacts = {
  mainCommits: [MAIN_COMMIT, OTHER_COMMIT],
  trackedPaths: new Set(['scripts/check-a.sh', 'docs/knowledge/a.md', 'CLAUDE.md']),
  verifiedSlugs: null,
};
const VALID_FIELDS: Readonly<Record<string, string>> = {
  date: '2026-08-01',
  'introduced-at': 'implementation',
  'detected-at': 'ci',
  severity: 'medium',
  'related-pr': "'#40'",
  'fix-pr': "'#41'",
  'fix-commits': '[abc1234]',
  'eradication-level': '2',
  'eradication-paths': '[scripts/check-a.sh]',
  tags: '[gates, ci]',
  zone: 'CLAUDE.md',
};

function buildEntry(
  slug: string,
  overrides: Readonly<Record<string, string | null>> = {},
  body = '# Title\n',
): DantotsuDocument {
  const fields = { ...VALID_FIELDS, ...overrides };
  const lines = Object.entries(fields)
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([name, value]) => `${name}: ${value}`);
  return readDantotsuDocument(slug, `---\n${lines.join('\n')}\n---\n${body}`);
}

function check(
  entries: readonly DantotsuDocument[],
  facts: SchemaFacts = FACTS,
): readonly string[] {
  return selectSchemaProblems(entries, facts);
}

describe('resolveCommit', () => {
  it('resolves a prefix that names exactly one commit on main', () => {
    expect(resolveCommit('abc', FACTS.mainCommits)).toBe(MAIN_COMMIT);
  });

  it('refuses an ambiguous prefix and an unknown one', () => {
    expect(resolveCommit('ab', FACTS.mainCommits)).toBeNull();
    expect(resolveCommit('fff', FACTS.mainCommits)).toBeNull();
  });
});

describe('selectSchemaProblems', () => {
  it('accepts a complete entry', () => {
    expect(check([buildEntry('valid')])).toEqual([]);
  });

  it('refuses an entry with no front matter', () => {
    expect(check([readDantotsuDocument('bare', '# Title\n')])).toEqual([
      'bare: has no front matter',
    ]);
  });

  it('names every missing required field', () => {
    expect(check([buildEntry('partial', { zone: null, severity: '' })])).toEqual([
      'partial: `severity:` is missing',
      'partial: `zone:` is missing',
    ]);
  });

  it('reports a missing date, pull request or fix commit as missing and nothing else', () => {
    const entry = buildEntry('bare-fields', {
      date: null,
      'related-pr': null,
      'fix-pr': null,
      'fix-commits': null,
    });
    expect(check([entry])).toEqual([
      'bare-fields: `date:` is missing',
      'bare-fields: `related-pr:` is missing',
      'bare-fields: `fix-pr:` is missing',
      'bare-fields: `fix-commits:` is missing',
    ]);
  });

  it('accepts a none whose reason reads like a placeholder', () => {
    expect(
      check([buildEntry('reason', { 'related-pr': 'none (pending the first merge)' })]),
    ).toEqual([]);
  });

  it('refuses a value outside each fixed list', () => {
    const problems = check([
      buildEntry('values', {
        'introduced-at': 'mutation-sweep',
        'detected-at': 'measurement',
        severity: 'huge',
        'eradication-level': '6',
      }),
    ]);
    expect(problems).toEqual([
      'values: `introduced-at: mutation-sweep` is not one of conception | implementation | self-validation | code-review',
      'values: `detected-at: measurement` is not one of typing | linter | local | ci | review | qa | staging | production | operator-deploy',
      'values: `severity: huge` is not one of low | medium | high',
      'values: `eradication-level: 6` is not one of 1 | 2 | 3 | 4 | 5',
    ]);
  });

  it('accepts a quoted value from a fixed list', () => {
    expect(check([buildEntry('quoted', { severity: "'low'" })])).toEqual([]);
  });

  it('refuses a date that is not YYYY-MM-DD', () => {
    expect(check([buildEntry('dated', { date: '10/08/2026' })])).toEqual([
      'dated: `date: 10/08/2026` is not a YYYY-MM-DD date',
    ]);
  });

  it('accepts a pull-request list and a none with a reason, and refuses anything else', () => {
    expect(
      check([
        buildEntry('pulls', { 'related-pr': "'#65, #66'", 'fix-pr': 'none (never shipped)' }),
      ]),
    ).toEqual([]);
    expect(check([buildEntry('bad-pull', { 'fix-pr': 'https://github.com/o/r/pull/40' })])).toEqual(
      [
        "bad-pull: `fix-pr: https://github.com/o/r/pull/40` is neither '#<number>' nor none (<reason>)",
      ],
    );
    expect(check([buildEntry('suffixed-pull', { 'related-pr': '#40 later' })])).toHaveLength(1);
  });

  it('refuses a placeholder in the front matter and in the text', () => {
    expect(
      check([buildEntry('placeholder', { 'fix-pr': '<to-be-filled-by-kaizen-pr>' })]),
    ).toContain('placeholder: `fix-pr: <to-be-filled-by-kaizen-pr>` is a placeholder');
    expect(check([buildEntry('tbd', { 'time-to-detect': 'TBD' })])).toEqual([
      'tbd: `time-to-detect: TBD` is a placeholder',
    ]);
    expect(check([buildEntry('pending', { 'time-to-detect': 'pending review' })])).toHaveLength(1);
    expect(check([buildEntry('body', {}, '# Title\n\ncommit `<kaizen-commit>`\n')])).toEqual([
      'body: the text still carries the placeholder <kaizen-commit>',
    ]);
  });

  it('accepts a none with a reason in fix-commits, and self', () => {
    expect(
      check([buildEntry('none', { 'fix-commits': 'none (the hook was never committed)' })]),
    ).toEqual([]);
    expect(check([buildEntry('self', { 'fix-commits': '[self]' })])).toEqual([]);
  });

  it('refuses an empty fix-commits list and a value that is no list', () => {
    const message = 'lists no commit; write none (<reason>)';
    expect(check([buildEntry('empty', { 'fix-commits': '[]' })])[0]).toContain(message);
    expect(check([buildEntry('scalar', { 'fix-commits': 'abc1234' })])[0]).toContain(message);
  });

  it('refuses a commit that is not a hash, or does not resolve on main', () => {
    expect(check([buildEntry('words', { 'fix-commits': '[pending]' })])).toContain(
      'words: `pending` in fix-commits is not a commit hash',
    );
    expect(check([buildEntry('gone', { 'fix-commits': '[fff0000]' })])).toEqual([
      'gone: commit fff0000 does not resolve to one commit on main',
    ]);
  });

  it('verifies commits only for the slugs it was told to verify', () => {
    const facts = { ...FACTS, verifiedSlugs: new Set(['other']) };
    expect(check([buildEntry('gone', { 'fix-commits': '[fff0000]' })], facts)).toEqual([]);
    expect(
      check([buildEntry('gone', { 'fix-commits': '[fff0000]' })], {
        ...facts,
        verifiedSlugs: new Set(['gone']),
      }),
    ).toHaveLength(1);
  });

  it('refuses an eradication path that is not in the repository', () => {
    expect(
      check([
        buildEntry('missing', { 'eradication-paths': '[scripts/check-a.sh, scripts/gone.sh]' }),
      ]),
    ).toEqual(['missing: eradication path scripts/gone.sh is not in the repository']);
  });

  it('refuses a level from 1 to 4 that names only markdown', () => {
    const problems = check([
      buildEntry('prose', {
        'eradication-paths': '[docs/knowledge/a.md]',
        'eradication-level': '1',
      }),
    ]);
    expect(problems).toEqual([
      'prose: level 1 names no eradication file other than markdown; an instruction edit is level 5',
    ]);
    expect(
      check([buildEntry('none-named', { 'eradication-paths': '[]', 'eradication-level': '4' })]),
    ).toHaveLength(1);
  });

  it('accepts level 5 with no eradication file', () => {
    expect(
      check([buildEntry('knowledge', { 'eradication-paths': '[]', 'eradication-level': '5' })]),
    ).toEqual([]);
  });

  it('skips the path rules when eradication-paths is not a list', () => {
    expect(check([buildEntry('scalar', { 'eradication-paths': 'CLAUDE.md' })])).toEqual([]);
  });

  it('refuses tags that are not a non-empty list', () => {
    const message = 'must be a non-empty [list]';
    expect(check([buildEntry('no-tags', { tags: '[]' })])[0]).toContain(message);
    expect(check([buildEntry('scalar-tags', { tags: 'gates' })])[0]).toContain(message);
  });

  it('accepts recurs naming an existing entry, or none with a reason', () => {
    const earlier = buildEntry('earlier');
    expect(check([earlier, buildEntry('later', { recurs: '[earlier]' })])).toEqual([]);
    expect(check([earlier, buildEntry('later', { recurs: 'none (a different class)' })])).toEqual(
      [],
    );
  });

  it('refuses recurs naming an unknown entry, an empty list, or a scalar', () => {
    expect(check([buildEntry('later', { recurs: '[ghost]' })])).toEqual([
      'later: recurs names ghost, which is not a dantotsu',
    ]);
    const message = 'is neither a [list] of entries nor none (<reason>)';
    expect(check([buildEntry('later', { recurs: '[]' })])[0]).toContain(message);
    expect(check([buildEntry('later', { recurs: 'ghost' })])[0]).toContain(message);
  });

  it('asks a new entry that shares two tags with an earlier one to fill recurs', () => {
    const earlier = buildEntry('earlier', { date: '2026-10-09', tags: '[gates, ci, hooks]' });
    const later = buildEntry('later', { date: '2026-10-10', tags: '[gates, ci]' });
    expect(check([earlier, later])).toEqual([
      'later: shares 2 or more tags with earlier; write recurs: [<entry>] naming the one this repeats, or recurs: none (<why it is a different class>)',
    ]);
  });

  it('names at most three overlapping entries', () => {
    const earlier = ['a', 'b', 'c', 'd'].map((slug) => buildEntry(slug, { date: '2026-10-10' }));
    const later = buildEntry('later', { date: '2026-10-11' });
    const problem = check([...earlier, later]).find((entry) => entry.startsWith('later:')) ?? '';
    expect(problem).toContain('with a, b, c;');
  });

  it('asks nothing of an entry written before the rule, sharing one tag, or older than its match', () => {
    expect(
      check([
        buildEntry('older', { date: '2026-10-01' }),
        buildEntry('old', { date: '2026-10-09' }),
      ]),
    ).toEqual([]);
    const base = buildEntry('base', { date: '2026-10-11', tags: '[gates, ci]' });
    expect(
      check([base, buildEntry('one-tag', { date: '2026-10-12', tags: '[gates, deploy]' })]),
    ).toEqual([]);
  });

  it('reads a missing level as no level when checking the eradication paths', () => {
    expect(
      check([
        buildEntry('no-level', {
          'eradication-level': null,
          'eradication-paths': '[docs/knowledge/a.md]',
        }),
      ]),
    ).toEqual(['no-level: `eradication-level:` is missing']);
  });

  it('checks recurs for an entry with no tags, and compares against entries with no date or no tags', () => {
    const untagged = buildEntry('untagged', { date: '2026-10-11', tags: null });
    expect(check([untagged])).toEqual([
      'untagged: `tags:` is missing',
      'untagged: `tags:` must be a non-empty [list]',
    ]);
    const undated = buildEntry('undated', { date: null });
    const bare = buildEntry('bare', { date: '2026-10-01', tags: null });
    const later = buildEntry('later', { date: '2026-10-11' });
    expect(check([undated, bare, later]).filter((problem) => problem.startsWith('later:'))).toEqual(
      [
        'later: shares 2 or more tags with undated; write recurs: [<entry>] naming the one this repeats, or recurs: none (<why it is a different class>)',
      ],
    );
  });

  it('compares a new entry with earlier and same-day entries only', () => {
    const today = buildEntry('today', { date: '2026-10-11' });
    const sameDay = buildEntry('same-day', { date: '2026-10-11' });
    const tomorrow = buildEntry('tomorrow', { date: '2026-10-12' });
    const problems = check([today, sameDay, tomorrow]);
    expect(problems.filter((problem) => problem.startsWith('today:'))).toEqual([
      'today: shares 2 or more tags with same-day; write recurs: [<entry>] naming the one this repeats, or recurs: none (<why it is a different class>)',
    ]);
  });

  it('asks nothing of an entry with no date', () => {
    const earlier = buildEntry('earlier', { date: '2026-10-01' });
    const undated = buildEntry('undated', { date: null });
    expect(check([earlier, undated])).toEqual(['undated: `date:` is missing']);
  });

  it('asks nothing of a new untagged entry beyond its tags', () => {
    const earlier = buildEntry('earlier', { date: '2026-10-01' });
    const untagged = buildEntry('untagged', { date: '2026-10-11', tags: null });
    expect(check([earlier, untagged])).toEqual([
      'untagged: `tags:` is missing',
      'untagged: `tags:` must be a non-empty [list]',
    ]);
  });
});
