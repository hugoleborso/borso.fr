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

  it('breaks on a rule the repository does not have', () => {
    const resolved = resolveCitation(
      buildCitation({ target: 'no-magic-numbers' }),
      buildFacts({ exists: false, activeScopes: [], candidateScopes: [] }),
    );
    expect(resolved.verdict).toBe('broken');
    expect(resolved.detail).toContain('does not exist');
  });

  it('breaks on a mechanism that exists and runs nowhere', () => {
    const resolved = resolveCitation(
      buildCitation({ kind: 'script', target: 'scripts/check-x.sh' }),
      buildFacts({ activeScopes: [], candidateScopes: [] }),
    );
    expect(resolved.verdict).toBe('broken');
    expect(resolved.detail).toContain('runs nowhere');
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

  it('passes a reviewer claim without asking anything of the repository', () => {
    const resolved = resolveCitation(
      buildCitation({ kind: 'reviewer', target: '' }),
      buildFacts({ exists: false, activeScopes: [] }),
    );
    expect(resolved.verdict).toBe('reviewer');
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
    expect(problems).toHaveLength(1);
    expect(problems[0]?.standard).toBe('07-state-and-effects.md');
  });

  it('reports an unscoped claim, because partial reach is not enforcement', () => {
    const unscoped = resolveCitation(
      buildCitation(),
      buildFacts({ candidateScopes: ['pragma/site', 'borso-fr/site'] }),
    );
    const problems = selectLedgerProblems(
      buildInput({ resolutionsByStandard: new Map([['07-state-and-effects.md', [unscoped]]]) }),
    );
    expect(problems).toHaveLength(1);
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
    expect(problems[0]?.message).toContain('no citation marker');
  });

  it('reports a mechanism that runs and that no standard claims', () => {
    const problems = selectLedgerProblems(
      buildInput({ orphans: [{ kind: 'eslint', target: 'borso/no-orphan' }] }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('no standard says why');
  });
});

describe('renderLedger', () => {
  it('marks an enforced claim yes and names where it runs', () => {
    const rendered = renderLedger(buildInput());
    expect(rendered).toContain('| `borso/no-use-effect` | ESLint rule | yes | pragma/site |');
  });

  it('marks a partial claim partly rather than yes', () => {
    const unscoped = resolveCitation(
      buildCitation(),
      buildFacts({ candidateScopes: ['pragma/site', 'borso-fr/site'] }),
    );
    const rendered = renderLedger(
      buildInput({ resolutionsByStandard: new Map([['07-state-and-effects.md', [unscoped]]]) }),
    );
    expect(rendered).toContain('| partly |');
  });

  it('lists a reviewer claim under the checklist the review agent works from', () => {
    const reviewerCitation = buildCitation({
      kind: 'reviewer',
      target: '',
      claim: '`reviewer` checks the layout at 375 pixels.',
    });
    const rendered = renderLedger(
      buildInput({
        resolutionsByStandard: new Map([
          ['07-state-and-effects.md', [resolveCitation(reviewerCitation, buildFacts())]],
        ]),
      }),
    );
    expect(rendered).toContain('## What only a reviewer can check');
    expect(rendered).toContain('`reviewer` checks the layout at 375 pixels.');
    expect(rendered).toContain('| (a reviewer) |');
  });

  it('says so when a standard names no enforcement at all', () => {
    const standard: StandardCitations = {
      standard: '00-principles.md',
      title: '00. Principles',
      citations: [],
      unmarkedBullets: [],
    };
    const rendered = renderLedger(
      buildInput({ standards: [standard], resolutionsByStandard: new Map() }),
    );
    expect(rendered).toContain('This standard names no enforcement.');
  });

  it('escapes a pipe so one detail cannot break the table', () => {
    const resolved: ResolvedCitation = {
      citation: buildCitation(),
      verdict: 'enforced',
      detail: 'a | b',
    };
    const rendered = renderLedger(
      buildInput({ resolutionsByStandard: new Map([['07-state-and-effects.md', [resolved]]]) }),
    );
    expect(rendered).toContain('a \\| b');
  });

  it('counts the claims a tool makes and the claims a person makes', () => {
    const rendered = renderLedger(buildInput());
    expect(rendered).toContain('- 1 claim(s) enforced by a tool');
    expect(rendered).toContain('- 0 claim(s) left to a reviewer');
    expect(rendered).toContain('- 0 problem(s)');
  });
});
