import { describe, expect, it } from 'vitest';
import {
  appendJournalSection,
  appendLineUnderHeading,
  chunkOperations,
  composeEventSummary,
  decodeAttributes,
  decodeJsonColumns,
  decodeJsonText,
  estimateWrittenRows,
  isRetryableConflict,
  MAXIMUM_BYTES_PER_TRANSACTION,
  MAXIMUM_ROWS_PER_TRANSACTION,
  selectOperationSubject,
} from './memory-changes.core';
import type { ChangeOperation } from './memory-changes.schema';

const STATE: ChangeOperation = { op: 'state.set', key: 'cursors', value: {} };
const SLUG = 'second-brain/personnes/alice-martin';
const UUID = '6f1c2b0e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';

describe('chunkOperations', () => {
  it('keeps a small call in one chunk', () => {
    expect(chunkOperations([STATE, STATE])).toEqual([{ from: 0, to: 1 }]);
    expect(chunkOperations([])).toEqual([]);
  });

  it('splits when the estimated rows pass the transaction limit', () => {
    const operations = Array.from({ length: MAXIMUM_ROWS_PER_TRANSACTION / 2 + 1 }, () => STATE);
    expect(chunkOperations(operations)).toEqual([
      { from: 0, to: MAXIMUM_ROWS_PER_TRANSACTION / 2 - 1 },
      { from: MAXIMUM_ROWS_PER_TRANSACTION / 2, to: MAXIMUM_ROWS_PER_TRANSACTION / 2 },
    ]);
  });

  it('splits when the estimated bytes pass the transaction limit, never leaving a chunk empty', () => {
    const large: ChangeOperation = {
      op: 'document.write',
      slug: 'archives/x',
      content: 'x'.repeat(MAXIMUM_BYTES_PER_TRANSACTION / 4),
    };
    expect(chunkOperations([large, large])).toEqual([
      { from: 0, to: 0 },
      { from: 1, to: 1 },
    ]);
  });

  it('counts a rename and a focus replacement heavier than a plain write', () => {
    expect(estimateWrittenRows({ op: 'entity.rename', from: 'a', to: 'b' })).toBe(500);
    expect(estimateWrittenRows({ op: 'focus.replace', items: [] })).toBe(4);
    expect(estimateWrittenRows(STATE)).toBe(2);
  });
});

describe('isRetryableConflict', () => {
  it('retries only an optimistic concurrency failure', () => {
    expect(isRetryableConflict({ code: '40001' })).toBe(true);
    expect(isRetryableConflict({ code: '23505' })).toBe(false);
    expect(isRetryableConflict(new Error('x'))).toBe(false);
  });
});

describe('selectOperationSubject', () => {
  it.each<[ChangeOperation, string, string]>([
    [{ op: 'entity.upsert', slug: SLUG, kind: 'personne', title: 'Alice' }, 'entity', SLUG],
    [{ op: 'entity.archive', slug: SLUG }, 'entity', SLUG],
    [{ op: 'entity.rename', from: SLUG, to: 'b' }, 'entity', 'b'],
    [{ op: 'alias.add', slug: SLUG, kind: 'name', value: 'Alice' }, 'entity', SLUG],
    [{ op: 'citation.add', slug: SLUG, sourceRef: 'gmail 1' }, 'entity', SLUG],
    [{ op: 'fact.add', slug: SLUG, value: 'Lyon' }, 'fact', SLUG],
    [{ op: 'fact.close', id: UUID, until: '2026' }, 'fact', UUID],
    [{ op: 'fact.confirm', id: UUID, seen: '2026' }, 'fact', UUID],
    [{ op: 'relation.add', from: SLUG, verb: 'ami_de', to: 'b' }, 'relation', SLUG],
    [{ op: 'relation.close', id: UUID, until: '2026' }, 'relation', UUID],
    [{ op: 'relation.confirm', id: UUID, seen: '2026' }, 'relation', UUID],
    [{ op: 'verb.add', name: 'ami_de', description: '', linkLength: 'medium' }, 'verb', 'ami_de'],
    [{ op: 'source.add', slug: 'sources/x', content: '' }, 'source', 'sources/x'],
    [
      { op: 'commitment.upsert', slug: 'engagements/x', status: 'ouvert' },
      'commitment',
      'engagements/x',
    ],
    [
      { op: 'commitment.status', slug: 'engagements/x', status: 'fait' },
      'commitment',
      'engagements/x',
    ],
    [{ op: 'todo.add', list: 'work', text: 'x' }, 'todo', 'work'],
    [{ op: 'todo.add', list: 'work', text: 'x', id: 'a1' }, 'todo', 'a1'],
    [{ op: 'todo.update', id: 'a1', done: true }, 'todo', 'a1'],
    [{ op: 'todo.remove', id: 'a1' }, 'todo', 'a1'],
    [{ op: 'focus.replace', items: [] }, 'focus', 'focus'],
    [
      {
        op: 'proposal.upsert',
        slug: 'etat/propositions/x',
        category: 'action',
        status: 'proposee',
        title: 'x',
        priority: 'haute',
        createdOn: '2026-10-01',
        body: '',
      },
      'proposal',
      'etat/propositions/x',
    ],
    [
      { op: 'proposal.status', slug: 'etat/propositions/x', status: 'faite' },
      'proposal',
      'etat/propositions/x',
    ],
    [
      {
        op: 'draft.upsert',
        slug: 'etat/brouillons/x',
        channel: 'gmail',
        recipients: 'Alice',
        status: 'pret',
        createdOn: '2026-10-01',
        body: '',
      },
      'draft',
      'etat/brouillons/x',
    ],
    [
      { op: 'draft.status', slug: 'etat/brouillons/x', status: 'envoye' },
      'draft',
      'etat/brouillons/x',
    ],
    [
      { op: 'journal.append', slug: 'journal/2026-10-08', heading: 'h', markdown: '' },
      'journal',
      'journal/2026-10-08',
    ],
    [
      { op: 'journal.write', slug: 'journal/2026-10-08', content: '' },
      'journal',
      'journal/2026-10-08',
    ],
    [{ op: 'document.write', slug: 'etat/questions', content: '' }, 'document', 'etat/questions'],
    [STATE, 'state', 'cursors'],
  ])('names what %o touches', (operation, objectType, objectId) => {
    expect(selectOperationSubject(operation)).toEqual({ objectType, objectId });
  });
});

describe('composeEventSummary', () => {
  it('gives the call summary to the first operation and a one-liner to the others', () => {
    expect(composeEventSummary(STATE, 'cursors', 'scan de nuit', 0)).toBe('scan de nuit');
    expect(composeEventSummary(STATE, 'cursors', 'scan de nuit', 1)).toBe('state.set cursors');
    expect(composeEventSummary(STATE, 'cursors', undefined, 0)).toBe('state.set cursors');
    expect(composeEventSummary(STATE, 'cursors', '', 0)).toBe('state.set cursors');
  });
});

describe('appendJournalSection', () => {
  it('creates the day with its title when absent, then appends the section', () => {
    expect(appendJournalSection(null, 'journal/2026-10-08', 'Scan', 'rien')).toBe(
      '# 2026-10-08\n\n## Scan\n\nrien\n',
    );
    expect(appendJournalSection('# 2026-10-08\n', 'journal/2026-10-08', 'Brief', 'ok')).toBe(
      '# 2026-10-08\n\n## Brief\n\nok\n',
    );
  });
});

describe('appendLineUnderHeading', () => {
  it('appends the line at the end of the section, before its trailing blank lines', () => {
    expect(appendLineUnderHeading('## Décision\n- a\n\n## Autre\n', 'Décision', '- b')).toBe(
      '## Décision\n- a\n- b\n\n## Autre\n',
    );
    expect(appendLineUnderHeading('## Suivi\n', 'Suivi', '- b')).toBe('## Suivi\n- b\n');
    expect(appendLineUnderHeading('# T\n## Suivi\n# Fin', 'Suivi', '- b')).toBe(
      '# T\n## Suivi\n- b\n# Fin',
    );
  });

  it('adds the heading when the body has none', () => {
    expect(appendLineUnderHeading('# Devis', 'Suivi', '- b')).toBe('# Devis\n\n## Suivi\n\n- b\n');
    expect(appendLineUnderHeading('', 'Suivi', '- b')).toBe('\n## Suivi\n\n- b\n');
  });
});

describe('decoding json text columns', () => {
  it('reads attributes and refuses a shape that is not a front matter', () => {
    expect(decodeAttributes('{"type":"personne","alias":["A"]}')).toEqual({
      type: 'personne',
      alias: ['A'],
    });
    expect(() => decodeAttributes('{"n":1}')).toThrow();
  });

  it('reads any json value and null', () => {
    expect(decodeJsonText('"database"')).toBe('database');
    expect(decodeJsonText(null)).toBeNull();
  });

  it('decodes the json columns of a row by table, leaving text columns alone', () => {
    expect(decodeJsonColumns('memory_todo', { id: 'a', extra: '[["k","v"]]' })).toEqual({
      id: 'a',
      extra: [['k', 'v']],
    });
    expect(decodeJsonColumns('memory_fact', { extra: 'libre' })).toEqual({ extra: 'libre' });
    expect(decodeJsonColumns('memory_event', { before: null })).toEqual({ before: null });
    expect(decodeJsonColumns('inconnue', { value: '1' })).toEqual({ value: '1' });
  });
});
