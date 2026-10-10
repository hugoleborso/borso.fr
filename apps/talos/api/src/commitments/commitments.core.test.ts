import { describe, expect, it } from 'vitest';
import {
  countCommitments,
  isCommitmentFile,
  parseOpenCommitment,
  selectCommitmentsDueBy,
  selectOpenCommitments,
} from './commitments.core';

function commitmentFile(lines: readonly string[], body = ''): string {
  return ['---', ...lines, '---', body].join('\n');
}

describe('parseOpenCommitment', () => {
  it('reads an open commitment, its direction, its counterpart and the day it is due', () => {
    const markdown = commitmentFile(
      [
        'type: engagement',
        'sens: moi->eux',
        'qui: "[[second-brain/personnes/alice]]"',
        'quoi: Envoyer le devis',
        'echeance: 2026-10-14 09:00',
        'statut: ouvert',
      ],
      '# Le devis Acme\n',
    );
    expect(parseOpenCommitment('engagements/2026-10-14-devis.md', markdown)).toStrictEqual({
      path: 'engagements/2026-10-14-devis',
      title: 'Le devis Acme',
      direction: 'owed',
      counterpart: 'second-brain/personnes/alice',
      action: 'Envoyer le devis',
      dueDate: '2026-10-14',
    });
  });

  it('keeps the name of a counterpart who has no page', () => {
    expect(
      parseOpenCommitment(
        'engagements/f.md',
        commitmentFile([
          'type: engagement',
          'qui: "  Bruno Martin "',
          'quoi: " "',
          'statut: ouvert',
        ]),
      ),
    ).toStrictEqual({
      path: 'engagements/f',
      title: 'engagements/f',
      direction: null,
      counterpartName: 'Bruno Martin',
    });
  });

  it('falls back on what was promised, then on the path, and leaves out what is missing', () => {
    expect(
      parseOpenCommitment(
        'engagements/a.md',
        commitmentFile([
          'type: engagement',
          'sens: eux->moi',
          'quoi: Rendre le livre',
          'statut: ouvert',
        ]),
      ),
    ).toStrictEqual({
      path: 'engagements/a',
      title: 'Rendre le livre',
      direction: 'awaited',
      action: 'Rendre le livre',
    });
    expect(
      parseOpenCommitment(
        'engagements/b.md',
        commitmentFile([
          'type: engagement',
          'sens: ailleurs',
          'echeance: bientôt',
          'statut: ouvert',
        ]),
      ),
    ).toStrictEqual({ path: 'engagements/b', title: 'engagements/b', direction: null });
  });

  it('ignores a closed commitment and a file of another type', () => {
    expect(
      parseOpenCommitment('engagements/c.md', commitmentFile(['type: engagement', 'statut: fait'])),
    ).toBeNull();
    expect(
      parseOpenCommitment('engagements/d.md', commitmentFile(['type: projet', 'statut: ouvert'])),
    ).toBeNull();
    expect(parseOpenCommitment('engagements/e.md', '# Sans en-tête')).toBeNull();
  });
});

describe('selectOpenCommitments', () => {
  it('keeps the open commitments, the soonest due first and the undated last by path', () => {
    const open = (dueDay?: string) =>
      commitmentFile([
        'type: engagement',
        'statut: ouvert',
        ...(dueDay === undefined ? [] : [`echeance: ${dueDay}`]),
      ]);
    const files = new Map([
      ['engagements/z.md', open()],
      ['engagements/late.md', open('2026-10-20')],
      ['engagements/y.md', open()],
      ['engagements/done.md', commitmentFile(['type: engagement', 'statut: fait'])],
      ['engagements/soon.md', open('2026-10-06')],
      ['engagements/same.md', open('2026-10-06')],
      ['engagements/early.md', open('2026-10-02')],
    ]);
    expect(selectOpenCommitments(files).map((commitment) => commitment.path)).toEqual([
      'engagements/early',
      'engagements/same',
      'engagements/soon',
      'engagements/late',
      'engagements/y',
      'engagements/z',
    ]);
  });
});

function dated(dueDay: string): string {
  return commitmentFile(['type: engagement', 'statut: ouvert', `echeance: ${dueDay}`]);
}

describe('selectOpenCommitments between two dated commitments', () => {
  it('puts the sooner one first whatever the order of the files', () => {
    const later = ['engagements/a-later.md', dated('2026-10-20')] as const;
    const sooner = ['engagements/b-sooner.md', dated('2026-10-06')] as const;
    for (const files of [new Map([later, sooner]), new Map([sooner, later])]) {
      expect(selectOpenCommitments(files).map((commitment) => commitment.path)).toEqual([
        'engagements/b-sooner',
        'engagements/a-later',
      ]);
    }
  });
});

describe('selectCommitmentsDueBy', () => {
  it('keeps the dated commitments due on or before the horizon', () => {
    const commitments = [
      { path: 'a', title: 'a', direction: null, dueDate: '2026-10-01' },
      { path: 'b', title: 'b', direction: null, dueDate: '2026-10-12' },
      { path: 'c', title: 'c', direction: null, dueDate: '2026-10-13' },
      { path: 'd', title: 'd', direction: null },
    ];
    expect(selectCommitmentsDueBy(commitments, '2026-10-12').map((entry) => entry.path)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('countCommitments', () => {
  it('counts what the owner owes and what is owed to them', () => {
    expect(
      countCommitments([
        { path: 'a', title: 'a', direction: 'owed' },
        { path: 'b', title: 'b', direction: 'owed' },
        { path: 'e', title: 'e', direction: 'owed' },
        { path: 'c', title: 'c', direction: 'awaited' },
        { path: 'd', title: 'd', direction: null },
      ]),
    ).toStrictEqual({ owed: 3, awaited: 1 });
  });
});

describe('isCommitmentFile', () => {
  it('accepts markdown files only', () => {
    expect(isCommitmentFile('engagements/a.md')).toBe(true);
    expect(isCommitmentFile('engagements/.gitkeep')).toBe(false);
  });
});
