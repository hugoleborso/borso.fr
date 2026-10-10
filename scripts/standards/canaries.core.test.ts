import { describe, expect, it } from 'vitest';
import {
  collectMechanisms,
  judgeCommandRun,
  judgeLintRun,
  listCheckedGenerators,
  renderOutcome,
  selectFailures,
  selectStrayCanaries,
  selectUnguardedMechanisms,
  type CanaryOutcome,
} from './canaries.core';

describe('collectMechanisms', () => {
  it('keeps one entry per target, sorted, and drops what no tool runs', () => {
    expect(
      collectMechanisms([
        { kind: 'script', target: 'scripts/check-b.sh' },
        { kind: 'eslint', target: 'borso/no-comments' },
        { kind: 'reviewer', target: 'naming is clear' },
        { kind: 'script', target: 'scripts/check-b.sh' },
        { kind: 'unheard-of', target: 'something' },
        { kind: 'gate', target: 'knip' },
        { kind: 'generator', target: 'scripts/a.ts' },
        { kind: 'test', target: 'parity.test.ts' },
        { kind: 'types', target: 'react-i18next.d.ts' },
      ]),
    ).toEqual([
      { kind: 'eslint', target: 'borso/no-comments' },
      { kind: 'gate', target: 'knip' },
      { kind: 'test', target: 'parity.test.ts' },
      { kind: 'types', target: 'react-i18next.d.ts' },
      { kind: 'generator', target: 'scripts/a.ts' },
      { kind: 'script', target: 'scripts/check-b.sh' },
    ]);
  });

  it('keeps the kind of the first citation of a target', () => {
    expect(
      collectMechanisms([
        { kind: 'generator', target: 'scripts/a.ts' },
        { kind: 'script', target: 'scripts/a.ts' },
      ]),
    ).toEqual([{ kind: 'generator', target: 'scripts/a.ts' }]);
  });
});

describe('listCheckedGenerators', () => {
  it('finds every generator a site runs with --check, once', () => {
    expect(
      listCheckedGenerators([
        'run_generator_check() { pnpm exec tsx "$1" --check; }\n  pnpm exec tsx scripts/b.ts --check\n',
        '- run: pnpm exec tsx scripts/a.ts --check\n- run: pnpm exec tsx scripts/b.ts --check\n',
        '- run: pnpm exec tsx scripts/c.ts\n- run: pnpm exec tsx scripts/d.ts --checked\n',
        'pnpm exec tsx "scripts/e.ts" --check',
      ]),
    ).toEqual(['scripts/a.ts', 'scripts/b.ts', 'scripts/e.ts']);
  });
});

describe('selectUnguardedMechanisms', () => {
  it('returns the mechanisms no canary names', () => {
    expect(
      selectUnguardedMechanisms(
        [
          { kind: 'gate', target: 'knip' },
          { kind: 'gate', target: 'stryker' },
        ],
        new Set(['knip']),
      ),
    ).toEqual([{ kind: 'gate', target: 'stryker' }]);
  });
});

describe('selectStrayCanaries', () => {
  it('returns each canary target naming no mechanism, once and sorted', () => {
    expect(
      selectStrayCanaries(['zeta', 'knip', 'alpha', 'zeta'], [{ kind: 'gate', target: 'knip' }]),
    ).toEqual(['alpha', 'zeta']);
  });
});

describe('judgeCommandRun', () => {
  it('calls a non-zero exit naming the planted defect a refusal', () => {
    expect(judgeCommandRun({ exitCode: 2, output: 'bad: planted.ts' }, /planted\.ts/)).toEqual({
      verdict: 'refused',
      detail: 'exit 2',
    });
  });

  it('calls a zero exit a pass, with the end of the output as evidence', () => {
    const output = Array.from({ length: 20 }, (_unused, index) => `line ${String(index)}`).join(
      '\n',
    );
    const judged = judgeCommandRun({ exitCode: 0, output: `${output}\n` }, /planted/);
    expect(judged.verdict).toBe('passed');
    expect(judged.detail.split('\n')).toHaveLength(12);
    expect(judged.detail.startsWith('line 8\n')).toBe(true);
    expect(judged.detail.endsWith('line 19')).toBe(true);
  });

  it('calls a failure that never names the planted defect a refusal for another reason', () => {
    expect(judgeCommandRun({ exitCode: 1, output: '  unrelated\n' }, /planted/)).toEqual({
      verdict: 'refused-for-another-reason',
      detail: 'exit 1 without /planted/:\nunrelated',
    });
  });
});

describe('judgeLintRun', () => {
  it('calls the rule being reported a refusal', () => {
    expect(judgeLintRun([null, 'borso/no-comments'], 'borso/no-comments', [])).toEqual({
      verdict: 'refused',
      detail: 'reported',
    });
  });

  it('calls a parse failure a refusal for another reason', () => {
    expect(judgeLintRun([null], 'borso/no-comments', ['Parsing error', 'second'])).toEqual({
      verdict: 'refused-for-another-reason',
      detail: 'Parsing error\nsecond',
    });
  });

  it('names the other rules when the expected one stayed silent', () => {
    expect(judgeLintRun(['a', null, 'b', 'a'], 'borso/no-comments', [])).toEqual({
      verdict: 'passed',
      detail: 'reported only a, b',
    });
  });

  it('says so when nothing was reported', () => {
    expect(judgeLintRun([], 'borso/no-comments', [])).toEqual({
      verdict: 'passed',
      detail: 'reported nothing',
    });
  });
});

const REFUSED: CanaryOutcome = {
  mechanism: 'knip',
  label: 'unused module',
  verdict: 'refused',
  detail: 'exit 1',
};

describe('selectFailures', () => {
  it('keeps every outcome that is not a refusal', () => {
    const passed: CanaryOutcome = { ...REFUSED, verdict: 'passed' };
    const broken: CanaryOutcome = { ...REFUSED, verdict: 'broken' };
    expect(selectFailures([REFUSED, passed, broken])).toEqual([passed, broken]);
  });
});

describe('renderOutcome', () => {
  it('prints a refusal on one line', () => {
    expect(renderOutcome(REFUSED)).toBe('refused: unused module (knip)');
  });

  it('prints a pass loudly, with its evidence indented', () => {
    expect(renderOutcome({ ...REFUSED, verdict: 'passed', detail: 'one\ntwo' })).toBe(
      'PASSED A PLANTED DEFECT: unused module (knip)\n    one\n    two',
    );
  });

  it('names the other two failures for what they are', () => {
    expect(renderOutcome({ ...REFUSED, verdict: 'refused-for-another-reason', detail: 'x' })).toBe(
      'failed, but not on the planted defect: unused module (knip)\n    x',
    );
    expect(renderOutcome({ ...REFUSED, verdict: 'broken', detail: 'x' })).toBe(
      'canary could not be planted: unused module (knip)\n    x',
    );
  });
});
