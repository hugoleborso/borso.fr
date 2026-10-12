import { describe, expect, it } from 'vitest';
import {
  applyDraftStatus,
  buildDraftPath,
  changeDraftStatusFile,
  countReadyDrafts,
  isDraftFile,
  parseDraft,
  parseRecipients,
  readDraftSlug,
  selectDrafts,
} from './drafts.core';

function draftFile(
  lines: readonly string[],
  body = '\nBonjour Alice,\n\nOn se voit jeudi ?\n',
): string {
  return ['---', 'type: brouillon', ...lines, '---', body].join('\n');
}

const READY_DRAFT = draftFile([
  'canal: gmail              # gmail | slack',
  'destinataire: "Alice Martin [[second-brain/personnes/alice-martin]]"',
  'sujet: Jeudi',
  'lien: https://mail.example.com/d/1',
  'statut: pret              # pret | envoye | abandonne',
  'cree: 2026-10-08',
  'src: sources/2026/10/08/x.md',
  'proposition: 2026-10-08-relance',
  'envoye:                   # posé avec statut: envoye',
]);

describe('parseDraft', () => {
  it('reads every field of a draft and the exact text to copy', () => {
    expect(parseDraft('2026-10-08-jeudi', READY_DRAFT)).toStrictEqual({
      slug: '2026-10-08-jeudi',
      channel: 'gmail',
      recipients: [{ name: 'Alice Martin', page: 'second-brain/personnes/alice-martin' }],
      subject: 'Jeudi',
      link: 'https://mail.example.com/d/1',
      status: 'pret',
      createdOn: '2026-10-08',
      source: 'sources/2026/10/08/x.md',
      proposal: '2026-10-08-relance',
      body: 'Bonjour Alice,\n\nOn se voit jeudi ?',
    });
  });

  it('leaves out the empty fields and reads the day it was sent', () => {
    expect(
      parseDraft('a', draftFile(['sujet:', 'lien:', 'statut: envoye', 'envoye: 2026-10-09'], '')),
    ).toStrictEqual({
      slug: 'a',
      channel: '',
      recipients: [],
      status: 'envoye',
      createdOn: '',
      sentOn: '2026-10-09',
      body: '',
    });
  });

  it('reads a draft with a bare header as having no status yet', () => {
    expect(parseDraft('g', '---\ntype: brouillon\n---\n')).toMatchObject({
      status: '',
      createdOn: '',
    });
  });

  it('ignores a file of another type or without a header', () => {
    expect(parseDraft('b', '---\ntype: proposition\n---\n')).toBeNull();
    expect(parseDraft('c', 'Bonjour')).toBeNull();
  });
});

describe('parseRecipients', () => {
  it('reads several recipients, with or without a page, named from the page when unnamed', () => {
    expect(
      parseRecipients(
        'Alice [[second-brain/personnes/alice]], [[second-brain/personnes/bruno-dupont]], Claire, ',
      ),
    ).toStrictEqual([
      { name: 'Alice', page: 'second-brain/personnes/alice' },
      { name: 'bruno-dupont', page: 'second-brain/personnes/bruno-dupont' },
      { name: 'Claire' },
    ]);
  });
});

function createdOn(day: string): string {
  return draftFile([`cree: ${day}`, 'statut: pret']);
}

describe('selectDrafts', () => {
  it('keeps the drafts, newest first, then by slug', () => {
    const files = new Map([
      ['etat/brouillons/2026-10-07-a.md', createdOn('2026-10-07')],
      ['etat/brouillons/2026-10-08-a.md', createdOn('2026-10-08')],
      ['etat/brouillons/2026-10-08-b.md', createdOn('2026-10-08')],
      ['etat/brouillons/autre.md', '---\ntype: note\n---\n'],
    ]);
    expect(selectDrafts(files).map((draft) => draft.slug)).toEqual([
      '2026-10-08-b',
      '2026-10-08-a',
      '2026-10-07-a',
    ]);
  });
});

describe('countReadyDrafts', () => {
  it('counts the drafts still waiting to be sent', () => {
    const drafts = ['pret', 'envoye', 'pret', 'pret', 'abandonne'].map((status, index) => ({
      slug: String(index),
      channel: 'gmail',
      recipients: [],
      status,
      createdOn: '2026-10-08',
      body: '',
    }));
    expect(countReadyDrafts(drafts)).toBe(3);
  });
});

function headerLines(markdown: string): string[] {
  return markdown.split('\n').slice(0, 12);
}

describe('applyDraftStatus', () => {
  it('marks a draft sent with the day, touching no other line', () => {
    const sent = applyDraftStatus(READY_DRAFT, 'envoye', '2026-10-09');
    const lines = sent.split('\n');
    expect(lines[6]).toBe('statut: envoye');
    expect(lines[10]).toBe('envoye: 2026-10-09');
    expect(lines.toSpliced(10, 1).toSpliced(6, 1)).toEqual(
      READY_DRAFT.split('\n').toSpliced(10, 1).toSpliced(6, 1),
    );
  });

  it('abandons a draft without touching its empty sent day', () => {
    const abandoned = applyDraftStatus(READY_DRAFT, 'abandonne', '2026-10-09');
    expect(headerLines(abandoned)[6]).toBe('statut: abandonne');
    expect(headerLines(abandoned)[10]).toBe('envoye:                   # posé avec statut: envoye');
  });

  it('puts a sent draft back to ready and empties the day it was sent', () => {
    const sent = applyDraftStatus(READY_DRAFT, 'envoye', '2026-10-09');
    const ready = applyDraftStatus(sent, 'pret', '2026-10-09');
    expect(headerLines(ready)[6]).toBe('statut: pret');
    expect(headerLines(ready)[10]).toBe('envoye:');
  });

  it('keeps the sent day of a draft it does not put back to ready', () => {
    const sent = draftFile(['statut: envoye', 'envoye: 2026-10-09']);
    expect(applyDraftStatus(sent, 'abandonne', '2026-10-10')).toBe(
      draftFile(['statut: abandonne', 'envoye: 2026-10-09']),
    );
  });

  it('puts an abandoned draft back to ready without adding a sent day', () => {
    const abandoned = draftFile(['statut: abandonne']);
    expect(applyDraftStatus(abandoned, 'pret', '2026-10-09')).toBe(draftFile(['statut: pret']));
  });
});

describe('changeDraftStatusFile', () => {
  it('writes the new status with a French commit message and answers the changed draft', () => {
    const edit = changeDraftStatusFile('2026-10-08-jeudi', READY_DRAFT, {
      target: 'envoye',
      today: '2026-10-09',
    });
    expect(edit).toMatchObject({
      commitMessage: 'pwa : brouillon envoyé 2026-10-08-jeudi',
      outcome: { kind: 'changed', draft: { status: 'envoye', sentOn: '2026-10-09' } },
    });
  });

  it('names each change in its commit message, and drops the sent day on the way back', () => {
    const abandoned = changeDraftStatusFile('d', READY_DRAFT, {
      target: 'abandonne',
      today: '2026-10-09',
    });
    expect(abandoned).toMatchObject({ commitMessage: 'pwa : brouillon abandonné d' });
    const sent = draftFile(['statut: envoye', 'envoye: 2026-10-09']);
    const reopened = changeDraftStatusFile('d', sent, { target: 'pret', today: '2026-10-09' });
    expect(reopened).toMatchObject({ commitMessage: 'pwa : brouillon remis prêt d' });
    expect(reopened.outcome).toStrictEqual({
      kind: 'changed',
      draft: {
        slug: 'd',
        channel: '',
        recipients: [],
        status: 'pret',
        createdOn: '',
        body: 'Bonjour Alice,\n\nOn se voit jeudi ?',
      },
    });
  });

  it('answers not found for a missing file or one that is not a draft', () => {
    const change = { target: 'envoye', today: '2026-10-09' } as const;
    expect(changeDraftStatusFile('e', null, change)).toStrictEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
    expect(changeDraftStatusFile('e', '# Note', change)).toStrictEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
  });

  it('answers a conflict when the draft already left that status', () => {
    const sent = draftFile(['statut: envoye']);
    expect(changeDraftStatusFile('f', sent, { target: 'abandonne', today: '2026-10-09' })).toEqual({
      content: null,
      outcome: { kind: 'conflict' },
    });
  });
});

describe('the draft paths', () => {
  it('builds the file of a slug, reads the slug back, and keeps markdown files only', () => {
    expect(buildDraftPath('2026-10-08-a')).toBe('etat/brouillons/2026-10-08-a.md');
    expect(readDraftSlug('etat/brouillons/2026-10-08-a.md')).toBe('2026-10-08-a');
    expect(isDraftFile('etat/brouillons/2026-10-08-a.md')).toBe(true);
    expect(isDraftFile('etat/brouillons/.gitkeep')).toBe(false);
  });
});
