import { describe, expect, it } from 'vitest';
import type { Citation, StandardCitations } from './citations.core';
import {
  renderLedger,
  resolveCitation,
  selectLedgerProblems,
  type LedgerInput,
  type MechanismFacts,
  type ResolvedCitation,
} from './ledger.core';

function buildCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    kind: 'eslint',
    target: 'borso/no-use-effect',
    claim: '`eslint:borso/no-use-effect` rejects effects.',
    ...overrides,
  };
}

function buildFacts(overrides: Partial<MechanismFacts> = {}): MechanismFacts {
  return {
    exists: true,
    activeScopes: ['pragma/site'],
    candidateScopes: ['pragma/site'],
    ...overrides,
  };
}

describe('resolveCitation', () => {
  it('passes a rule that exists and reaches every candidate scope', () => {
    const resolved = resolveCitation(buildCitation(), buildFacts());
    expect(resolved.verdict).toBe('enforced');
    expect(resolved.detail).toBe('pragma/site');
  });

  it('lists every scope an enforced rule reaches', () => {
    const resolved = resolveCitation(
      buildCitation(),
      buildFacts({
        activeScopes: ['pragma/site', 'borso-fr/site'],
        candidateScopes: ['pragma/site', 'borso-fr/site'],
      }),
    );
    expect(resolved.detail).toBe('pragma/site, borso-fr/site');
  });

  it('breaks on a rule the repository does not have', () => {
    const resolved = resolveCitation(
      buildCitation({ target: 'no-magic-numbers' }),
      buildFacts({ exists: false, activeScopes: [], candidateScopes: [] }),
    );
    expect(resolved.verdict).toBe('broken');
    expect(resolved.detail).toBe('`no-magic-numbers` is cited by this standard and does not exist');
  });

  it('breaks on a mechanism that exists and runs nowhere', () => {
    const resolved = resolveCitation(
      buildCitation({ kind: 'script', target: 'scripts/check-x.sh' }),
      buildFacts({ activeScopes: [], candidateScopes: [] }),
    );
    expect(resolved.verdict).toBe('broken');
    expect(resolved.detail).toBe('`scripts/check-x.sh` exists but runs nowhere');
  });

  it('reports a rule that reaches some applications and not others', () => {
    const resolved = resolveCitation(
      buildCitation(),
      buildFacts({
        activeScopes: ['pragma/site'],
        candidateScopes: ['pragma/site', 'borso-fr/site'],
      }),
    );
    expect(resolved.verdict).toBe('unscoped');
    expect(resolved.detail).toBe('runs on pragma/site; not on borso-fr/site');
  });

  it('lists every scope on both sides of an unscoped verdict', () => {
    const resolved = resolveCitation(
      buildCitation(),
      buildFacts({
        activeScopes: ['pragma/site', 'pragma/api'],
        candidateScopes: ['pragma/site', 'pragma/api', 'borso-fr/site', 'borsouvertures/site'],
      }),
    );
    expect(resolved.detail).toBe(
      'runs on pragma/site, pragma/api; not on borso-fr/site, borsouvertures/site',
    );
  });

  it('passes a reviewer claim without asking anything of the repository', () => {
    const resolved = resolveCitation(
      buildCitation({ kind: 'reviewer', target: '' }),
      buildFacts({ exists: false, activeScopes: [] }),
    );
    expect(resolved.verdict).toBe('reviewer');
    expect(resolved.detail).toBe('checked by a reviewer, not by a tool');
  });
});

function buildInput(overrides: Partial<LedgerInput> = {}): LedgerInput {
  const standard: StandardCitations = {
    standard: '07-state-and-effects.md',
    title: '07. State and effects',
    citations: [buildCitation()],
    unmarkedBullets: [],
  };
  const resolutions: readonly ResolvedCitation[] = [resolveCitation(buildCitation(), buildFacts())];
  return {
    standards: [standard],
    resolutionsByStandard: new Map([[standard.standard, resolutions]]),
    orphans: [],
    ...overrides,
  };
}

describe('selectLedgerProblems', () => {
  it('finds nothing wrong with a standard whose claims all hold', () => {
    expect(selectLedgerProblems(buildInput())).toEqual([]);
  });

  it('reports a broken claim against its standard', () => {
    const broken = resolveCitation(buildCitation(), buildFacts({ exists: false }));
    const problems = selectLedgerProblems(
      buildInput({ resolutionsByStandard: new Map([['07-state-and-effects.md', [broken]]]) }),
    );
    expect(problems).toEqual([
      {
        standard: '07-state-and-effects.md',
        message: '`borso/no-use-effect` is cited by this standard and does not exist',
      },
    ]);
  });

  it('reports an unscoped claim, because partial reach is not enforcement', () => {
    const unscoped = resolveCitation(
      buildCitation(),
      buildFacts({ candidateScopes: ['pragma/site', 'borso-fr/site'] }),
    );
    const problems = selectLedgerProblems(
      buildInput({ resolutionsByStandard: new Map([['07-state-and-effects.md', [unscoped]]]) }),
    );
    expect(problems).toEqual([
      {
        standard: '07-state-and-effects.md',
        message: 'runs on pragma/site; not on borso-fr/site',
      },
    ]);
  });

  it('reports a bullet that opens with no citation marker', () => {
    const standard: StandardCitations = {
      standard: '12-linting-and-gates.md',
      title: '12. Lint and gates',
      citations: [],
      unmarkedBullets: ['The hooks in `.husky/`.'],
    };
    const problems = selectLedgerProblems(
      buildInput({ standards: [standard], resolutionsByStandard: new Map() }),
    );
    expect(problems).toEqual([
      {
        standard: '12-linting-and-gates.md',
        message: 'this bullet opens with no citation marker: "The hooks in `.husky/`."',
      },
    ]);
  });

  it('reports a mechanism that runs and that no standard claims', () => {
    const problems = selectLedgerProblems(
      buildInput({ orphans: [{ kind: 'eslint', target: 'borso/no-orphan' }] }),
    );
    expect(problems).toEqual([
      { standard: '(none)', message: '`borso/no-orphan` runs and no standard says why' },
    ]);
  });
});

describe('renderLedger', () => {
  it('renders the whole page for a standard whose one claim a tool enforces', () => {
    expect(renderLedger(buildInput()).split('\n')).toEqual([
      '<!-- Generated by scripts/standards/enforcement-ledger.ts. Do not edit by hand. -->',
      '',
      '# Enforcement ledger',
      '',
      'Every mechanism the standards claim, and whether it exists, where it runs,',
      'and which applications it reaches.',
      '',
      'This page is generated. `scripts/standards/enforcement-ledger.ts --check`',
      'regenerates it and fails when a standard cites a rule that is not enabled,',
      'a script no hook invokes, a workflow that is not there, or when a mechanism',
      'runs and no standard explains it. So a standard cannot claim enforcement it',
      'does not have, which is the failure this page was written to end.',
      '',
      '`partly` is not a pass. It means the mechanism is real and does not reach',
      'every application the standard covers.',
      '',
      '## 07. State and effects',
      '',
      '`docs/standards/07-state-and-effects.md`',
      '',
      '| Mechanism | Kind | Enforced | Where |',
      '| --- | --- | --- | --- |',
      '| `borso/no-use-effect` | ESLint rule | yes | pragma/site |',
      '',
      '## What only a reviewer can check',
      '',
      '0 claim(s) below hand the check to a person, because no tool can make it.',
      'They are the checklist the standards review agent works from, so the agent',
      'reviews what lint cannot rather than repeating what lint already did.',
      '',
      '## Totals',
      '',
      '- 1 claim(s) enforced by a tool',
      '- 0 claim(s) left to a reviewer',
      '- 0 problem(s)',
      '',
    ]);
  });

  /**
   * One standard mixing a tool claim with a reviewer claim, one naming no
   * enforcement at all, and one orphan. The checklist section names only the
   * standard that has a reviewer claim, and the totals count each kind once.
   */
  it('renders the whole page for a mixed ledger', () => {
    const standard: StandardCitations = {
      standard: '07-state-and-effects.md',
      title: '07. State and effects',
      citations: [buildCitation()],
      unmarkedBullets: [],
    };
    const unenforcedStandard: StandardCitations = {
      standard: '00-principles.md',
      title: '00. Principles',
      citations: [],
      unmarkedBullets: [],
    };
    const reviewerResolution = resolveCitation(
      buildCitation({
        kind: 'reviewer',
        target: '',
        claim: '`reviewer` checks the layout at 375 pixels.',
      }),
      buildFacts(),
    );
    const rendered = renderLedger({
      standards: [standard, unenforcedStandard],
      resolutionsByStandard: new Map([
        [standard.standard, [resolveCitation(buildCitation(), buildFacts()), reviewerResolution]],
      ]),
      orphans: [{ kind: 'eslint', target: 'borso/no-orphan' }],
    });

    expect(rendered.split('\n')).toEqual([
      '<!-- Generated by scripts/standards/enforcement-ledger.ts. Do not edit by hand. -->',
      '',
      '# Enforcement ledger',
      '',
      'Every mechanism the standards claim, and whether it exists, where it runs,',
      'and which applications it reaches.',
      '',
      'This page is generated. `scripts/standards/enforcement-ledger.ts --check`',
      'regenerates it and fails when a standard cites a rule that is not enabled,',
      'a script no hook invokes, a workflow that is not there, or when a mechanism',
      'runs and no standard explains it. So a standard cannot claim enforcement it',
      'does not have, which is the failure this page was written to end.',
      '',
      '`partly` is not a pass. It means the mechanism is real and does not reach',
      'every application the standard covers.',
      '',
      '## 07. State and effects',
      '',
      '`docs/standards/07-state-and-effects.md`',
      '',
      '| Mechanism | Kind | Enforced | Where |',
      '| --- | --- | --- | --- |',
      '| `borso/no-use-effect` | ESLint rule | yes | pragma/site |',
      '| (a reviewer) | reviewer judgement | reviewer | checked by a reviewer, not by a tool |',
      '',
      '## 00. Principles',
      '',
      '`docs/standards/00-principles.md`',
      '',
      'This standard names no enforcement.',
      '',
      '## What only a reviewer can check',
      '',
      '1 claim(s) below hand the check to a person, because no tool can make it.',
      'They are the checklist the standards review agent works from, so the agent',
      'reviews what lint cannot rather than repeating what lint already did.',
      '',
      '### 07. State and effects',
      '',
      '- `reviewer` checks the layout at 375 pixels.',
      '',
      '## Totals',
      '',
      '- 1 claim(s) enforced by a tool',
      '- 1 claim(s) left to a reviewer',
      '- 1 problem(s)',
      '',
    ]);
  });

  it('marks a partial claim partly rather than yes, and leaves it out of the totals', () => {
    const unscoped = resolveCitation(
      buildCitation(),
      buildFacts({ candidateScopes: ['pragma/site', 'borso-fr/site'] }),
    );
    const rendered = renderLedger(
      buildInput({ resolutionsByStandard: new Map([['07-state-and-effects.md', [unscoped]]]) }),
    );
    const lines = rendered.split('\n');
    expect(lines).toContain(
      '| `borso/no-use-effect` | ESLint rule | partly | runs on pragma/site; not on borso-fr/site |',
    );
    expect(lines).toContain('- 0 claim(s) enforced by a tool');
    expect(lines).toContain('- 0 claim(s) left to a reviewer');
    expect(lines).toContain('- 1 problem(s)');
  });

  it('escapes a pipe and folds a newline, so one detail cannot break the table', () => {
    const resolved: ResolvedCitation = {
      citation: buildCitation(),
      verdict: 'enforced',
      detail: 'a | b\nc',
    };
    const rendered = renderLedger(
      buildInput({ resolutionsByStandard: new Map([['07-state-and-effects.md', [resolved]]]) }),
    );
    expect(rendered.split('\n')).toContain(
      '| `borso/no-use-effect` | ESLint rule | yes | a \\| b c |',
    );
  });
});
