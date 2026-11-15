import { describe, expect, it } from 'vitest';
import {
  applyDecisionCancellation,
  applyProposalDecision,
  checkDecisionOption,
  formatDecisionLine,
  isDecisionActionable,
  isDecisionRevocable,
  isProposalExpired,
  isProposalPending,
  MAXIMUM_DECISION_COMMENT_LENGTH,
  MAXIMUM_DECISION_LINE_LENGTH,
  MAXIMUM_DECISION_OPTION_LENGTH,
  parseProposal,
  type Proposal,
  sortProposalsNewestFirst,
} from './proposal.core';

const PROPOSAL_FILE = [
  '---',
  'type: proposition',
  'categorie: action        # action | initiative',
  'statut: proposee',
  'titre: Envoyer ton CV à Bruno',
  'priorite: haute',
  'cree: 2026-10-04',
  'expire: 2026-10-05',
  '---',
  '## Pourquoi',
  'Bruno attend.',
  '',
  '## Ce que Talos propose',
  '> Hi Bruno',
  '',
  '## Décision',
  '',
].join('\n');

function buildProposal(overrides: Partial<Proposal>): Proposal {
  return {
    slug: 'x',
    category: 'action',
    status: 'proposee',
    title: 'x',
    priority: 'normale',
    createdOn: '2026-10-04',
    why: '',
    draft: '',
    options: [],
    decisions: [],
    ...overrides,
  };
}

describe('parseProposal', () => {
  it('maps the front matter and the three sections to the contract fields', () => {
    expect(parseProposal('2026-10-04-cv', PROPOSAL_FILE)).toStrictEqual({
      slug: '2026-10-04-cv',
      category: 'action',
      status: 'proposee',
      title: 'Envoyer ton CV à Bruno',
      priority: 'haute',
      createdOn: '2026-10-04',
      expiresOn: '2026-10-05',
      why: 'Bruno attend.',
      draft: '> Hi Bruno',
      options: [],
      decisions: [],
    });
  });

  it('lists the decision lines without their bullet', () => {
    const decided = `${PROPOSAL_FILE}- 2026-10-05 10:12 : acceptée\nune note\n- 2026-10-06 : faite  \n- 2026-10-07 : vue\n`;
    expect(parseProposal('x', decided)?.decisions).toEqual([
      '2026-10-05 10:12 : acceptée',
      '2026-10-06 : faite',
      '2026-10-07 : vue',
    ]);
  });

  it('fills absent fields with empty values and the slug as title', () => {
    expect(parseProposal('2026-10-05-idee', '---\ntype: proposition\n---\n')).toStrictEqual({
      slug: '2026-10-05-idee',
      category: '',
      status: '',
      title: '2026-10-05-idee',
      priority: '',
      createdOn: '',
      why: '',
      draft: '',
      options: [],
      decisions: [],
    });
  });

  it('lists the options in order, trimmed, without the blank items', () => {
    const withOptions = PROPOSAL_FILE.replace(
      '## Décision',
      '## Options\n- mardi \n-  \nune note\n- jeudi\n- pas cette semaine\n\n## Décision',
    );
    expect(parseProposal('x', withOptions)?.options).toEqual([
      'mardi',
      'jeudi',
      'pas cette semaine',
    ]);
  });

  it('keeps two options, the fewest that make a choice', () => {
    const withTwo = PROPOSAL_FILE.replace(
      '## Décision',
      '## Options\n- mardi\n- jeudi\n\n## Décision',
    );
    expect(parseProposal('x', withTwo)?.options).toEqual(['mardi', 'jeudi']);
  });

  it('keeps one button per distinct option', () => {
    const withDuplicate = PROPOSAL_FILE.replace(
      '## Décision',
      '## Options\n- mardi\n- mardi\n- jeudi\n\n## Décision',
    );
    expect(parseProposal('x', withDuplicate)?.options).toEqual(['mardi', 'jeudi']);
  });

  it('gives no option when the only items repeat one choice', () => {
    const withRepeat = PROPOSAL_FILE.replace(
      '## Décision',
      '## Options\n- mardi\n- mardi\n\n## Décision',
    );
    expect(parseProposal('x', withRepeat)?.options).toEqual([]);
  });

  it('gives no option for a section with a single item', () => {
    const withOne = PROPOSAL_FILE.replace(
      '## Décision',
      '## Options\n- mardi\n-   \n\n## Décision',
    );
    expect(parseProposal('x', withOne)?.options).toEqual([]);
  });

  it('ignores a file that is not a proposal', () => {
    expect(parseProposal('2026-10-05', '---\ntype: journal\n---\n# Notes')).toBeNull();
  });
});

describe('isDecisionActionable', () => {
  it('acts on an acceptance, with or without a choice', () => {
    expect(isDecisionActionable('acceptee')).toBe(true);
  });

  it('leaves a refusal to the memory alone', () => {
    expect(isDecisionActionable('refusee')).toBe(false);
  });
});

describe('isProposalPending', () => {
  it('counts a proposed proposal that has not expired', () => {
    expect(isProposalPending(buildProposal({ expiresOn: '2026-10-05' }), '2026-10-05')).toBe(true);
  });

  it('counts a proposed proposal without expiry', () => {
    expect(isProposalPending(buildProposal({}), '2026-12-31')).toBe(true);
  });

  it('drops a proposal past its expiry', () => {
    expect(isProposalPending(buildProposal({ expiresOn: '2026-10-04' }), '2026-10-05')).toBe(false);
  });

  it('drops a proposal already decided', () => {
    expect(isProposalPending(buildProposal({ status: 'acceptee' }), '2026-10-01')).toBe(false);
  });
});

describe('isProposalExpired', () => {
  it('folds a proposed proposal past its expiry', () => {
    expect(isProposalExpired(buildProposal({ expiresOn: '2026-10-04' }), '2026-10-05')).toBe(true);
  });

  it('keeps a proposal on its last day, or without expiry, out of the expired ones', () => {
    expect(isProposalExpired(buildProposal({ expiresOn: '2026-10-05' }), '2026-10-05')).toBe(false);
    expect(isProposalExpired(buildProposal({}), '2026-12-31')).toBe(false);
  });

  it('leaves a decided proposal in its history, whatever its expiry', () => {
    expect(
      isProposalExpired(
        buildProposal({ status: 'refusee', expiresOn: '2026-10-01' }),
        '2026-10-05',
      ),
    ).toBe(false);
  });
});

describe('sortProposalsNewestFirst', () => {
  it('orders by creation date, then by slug, newest first', () => {
    const proposals = [
      buildProposal({ slug: '2026-10-03-a', createdOn: '2026-10-03' }),
      buildProposal({ slug: '2026-10-04-a', createdOn: '2026-10-04' }),
      buildProposal({ slug: '2026-10-04-b', createdOn: '2026-10-04' }),
    ];
    expect(sortProposalsNewestFirst(proposals).map((proposal) => proposal.slug)).toEqual([
      '2026-10-04-b',
      '2026-10-04-a',
      '2026-10-03-a',
    ]);
  });
});

describe('checkDecisionOption', () => {
  const options = ['mardi', 'jeudi'];

  it('accepts one of the offered options', () => {
    expect(checkDecisionOption(options, 'acceptee', 'jeudi')).toBe('offered');
  });

  it('rejects an option the proposal does not offer', () => {
    expect(checkDecisionOption(options, 'acceptee', 'vendredi')).toBe('not-offered');
    expect(checkDecisionOption([], 'acceptee', 'mardi')).toBe('not-offered');
  });

  it('rejects an option sent with a refusal', () => {
    expect(checkDecisionOption(options, 'refusee', 'mardi')).toBe('not-offered');
  });

  it('rejects a plain acceptance when the proposal offers options', () => {
    expect(checkDecisionOption(options, 'acceptee', undefined)).toBe('not-offered');
  });

  it('lets a refusal through on any proposal, and a plain acceptance without options', () => {
    expect(checkDecisionOption(options, 'refusee', undefined)).toBe('offered');
    expect(checkDecisionOption([], 'refusee', undefined)).toBe('offered');
    expect(checkDecisionOption([], 'acceptee', undefined)).toBe('offered');
  });
});

describe('formatDecisionLine', () => {
  it('names the chosen option in brackets, before the comment', () => {
    expect(
      formatDecisionLine({
        decision: 'acceptee',
        option: 'jeudi',
        comment: 'le matin',
        decidedAt: '2026-11-15 10:12',
      }),
    ).toBe('- 2026-11-15 10:12 : acceptée (jeudi) — le matin');
  });

  it('writes the option alone when no comment comes with it', () => {
    expect(
      formatDecisionLine({ decision: 'acceptee', option: 'mardi', decidedAt: '2026-11-15 10:12' }),
    ).toBe('- 2026-11-15 10:12 : acceptée (mardi)');
  });

  it('fits the longest choice and comment the API accepts within the memory line limit', () => {
    const longestLine = formatDecisionLine({
      decision: 'acceptee',
      option: 'x'.repeat(MAXIMUM_DECISION_OPTION_LENGTH),
      comment: 'x'.repeat(MAXIMUM_DECISION_COMMENT_LENGTH),
      decidedAt: '2026-11-15 10:12',
    });
    expect(longestLine.length).toBeLessThanOrEqual(MAXIMUM_DECISION_LINE_LENGTH);
  });
});

describe('applyProposalDecision', () => {
  it('sets the status and writes the decision line with its comment on one line', () => {
    const decided = applyProposalDecision(PROPOSAL_FILE, {
      decision: 'acceptee',
      comment: ' vas-y\n  mais vite ',
      decidedAt: '2026-10-05 10:12',
    });
    expect(decided).toBe(
      PROPOSAL_FILE.replace('statut: proposee', 'statut: acceptee').replace(
        '## Décision\n',
        '## Décision\n- 2026-10-05 10:12 : acceptée — vas-y mais vite\n',
      ),
    );
  });

  it('writes a refusal without a comment after the decisions already there', () => {
    const once = applyProposalDecision(PROPOSAL_FILE, {
      decision: 'acceptee',
      decidedAt: '2026-10-05 10:12',
    });
    const twice = applyProposalDecision(once, {
      decision: 'refusee',
      comment: '  ',
      decidedAt: '2026-10-05 11:00',
    });
    expect(twice.endsWith('- 2026-10-05 10:12 : acceptée\n- 2026-10-05 11:00 : refusée\n')).toBe(
      true,
    );
    expect(twice).toContain('statut: refusee');
  });

  it('keeps the decision inside its section when another section follows', () => {
    const markdown = '---\ntype: proposition\n---\n## Décision\n- ancienne\n\n## Suivi\n- rien\n';
    expect(
      applyProposalDecision(markdown, { decision: 'refusee', decidedAt: '2026-10-05 09:00' }),
    ).toBe(
      '---\ntype: proposition\nstatut: refusee\n---\n## Décision\n- ancienne\n- 2026-10-05 09:00 : refusée\n\n## Suivi\n- rien\n',
    );
  });

  it('writes after the last decision when the section sits between two others', () => {
    expect(
      applyProposalDecision(
        '---\nstatut: proposee\n---\n## Pourquoi\n## Décision\n- a\n## Suivi\n',
        {
          decision: 'acceptee',
          decidedAt: '2026-10-05 09:00',
        },
      ),
    ).toBe(
      '---\nstatut: acceptee\n---\n## Pourquoi\n## Décision\n- a\n- 2026-10-05 09:00 : acceptée\n## Suivi\n',
    );
  });

  it('writes under a heading that directly follows another one', () => {
    expect(
      applyProposalDecision('---\nstatut: proposee\n---\n## Pourquoi\n## Décision  \n', {
        decision: 'acceptee',
        decidedAt: '2026-10-05 09:00',
      }),
    ).toBe(
      '---\nstatut: acceptee\n---\n## Pourquoi\n## Décision  \n- 2026-10-05 09:00 : acceptée\n',
    );
  });

  it('writes right after the last decision, before blank-looking lines', () => {
    expect(
      applyProposalDecision('---\nstatut: proposee\n---\n## Décision\n- une\n   \n## Suivi\n', {
        decision: 'refusee',
        decidedAt: '2026-10-05 09:00',
      }),
    ).toBe(
      '---\nstatut: refusee\n---\n## Décision\n- une\n- 2026-10-05 09:00 : refusée\n   \n## Suivi\n',
    );
  });

  it('adds the decision section when the file lacks it', () => {
    expect(
      applyProposalDecision('---\nstatut: proposee\n---\n## Pourquoi\nx\n\n', {
        decision: 'acceptee',
        decidedAt: '2026-10-05 09:00',
      }),
    ).toBe(
      '---\nstatut: acceptee\n---\n## Pourquoi\nx\n\n## Décision\n- 2026-10-05 09:00 : acceptée\n',
    );
  });
});

describe('isDecisionRevocable', () => {
  it.each([
    ['acceptee', true],
    ['refusee', true],
    ['proposee', false],
    ['faite', false],
    ['expiree', false],
  ])('answers %s → %s', (status, expected) => {
    expect(isDecisionRevocable(status)).toBe(expected);
  });
});

describe('applyDecisionCancellation', () => {
  it('puts the status back to proposee and appends the cancellation after the decision', () => {
    const decided = applyProposalDecision(PROPOSAL_FILE, {
      decision: 'acceptee',
      decidedAt: '2026-10-05 10:12',
    });
    const cancelled = applyDecisionCancellation(decided, '2026-10-05 10:13');
    expect(cancelled).toBe(
      PROPOSAL_FILE.replace(
        '## Décision\n',
        '## Décision\n- 2026-10-05 10:12 : acceptée\n- 2026-10-05 10:13 : décision annulée\n',
      ),
    );
  });
});
