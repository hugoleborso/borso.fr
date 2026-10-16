import { describe, expect, it } from 'vitest';
import {
  isSourceConflicting,
  planEntityUpsert,
  planDraftStatus,
  planFactInsert,
  planFocusSlots,
  planRelationInsert,
  planStatusAttributes,
  planTodoInsert,
  planTodoUpdate,
} from './memory-plans.core';

const NOW = new Date('2026-10-16T08:00:00Z');
const TODAY = '2026-10-16';
const SLUG = 'second-brain/personnes/alice-martin';
const UPSERT = {
  op: 'entity.upsert' as const,
  slug: SLUG,
  kind: 'personne' as const,
  title: 'Alice Martin',
};
const EXISTING = {
  slug: SLUG,
  kind: 'personne',
  title: 'Alice',
  summary: 'Cliente',
  body: '# Alice',
  attributes: '{"type":"personne"}',
  closeness: 3,
  closenessReason: 'cliente',
  confidentiality: null,
  archived: false,
  version: 4,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('planEntityUpsert', () => {
  it('creates version 1 with an empty body and the kind as type', () => {
    expect(planEntityUpsert(null, UPSERT, NOW)).toEqual({
      kind: 'write',
      status: 'created',
      values: {
        ...UPSERT,
        op: undefined,
        summary: null,
        body: '',
        attributes: '{"type":"personne"}',
        closeness: null,
        closenessReason: null,
        confidentiality: null,
        archived: false,
        version: 1,
        createdAt: NOW,
        updatedAt: NOW,
      },
    } satisfies unknown);
  });

  it('keeps the fields an update leaves out and bumps the version', () => {
    const plan = planEntityUpsert(
      EXISTING,
      { ...UPSERT, attributes: { type: 'personne', alias: 'A' }, closeness: 5 },
      NOW,
    );
    expect(plan).toMatchObject({
      kind: 'write',
      status: 'updated',
      values: {
        title: 'Alice Martin',
        summary: 'Cliente',
        body: '# Alice',
        attributes: '{"type":"personne","alias":"A"}',
        closeness: 5,
        closenessReason: 'cliente',
        version: 5,
        createdAt: EXISTING.createdAt,
      },
    });
    expect(planEntityUpsert(EXISTING, { ...UPSERT, confidentiality: 'privé' }, NOW)).toMatchObject({
      values: { confidentiality: 'privé' },
    });
    expect(planEntityUpsert(EXISTING, UPSERT, NOW)).toMatchObject({
      values: { attributes: '{"type":"personne"}' },
    });
  });

  it('refuses a stale expected version, and expects version 1 on creation', () => {
    expect(planEntityUpsert(EXISTING, { ...UPSERT, expectedVersion: 3 }, NOW)).toEqual({
      kind: 'version-conflict',
    });
    expect(planEntityUpsert(EXISTING, { ...UPSERT, expectedVersion: 4 }, NOW).kind).toBe('write');
    expect(planEntityUpsert(null, { ...UPSERT, expectedVersion: 2 }, NOW).kind).toBe(
      'version-conflict',
    );
  });
});

describe('isSourceConflicting', () => {
  it('refuses only a different content under an existing slug', () => {
    expect(isSourceConflicting(null, 'a')).toBe(false);
    expect(isSourceConflicting({ content: 'a' }, 'a')).toBe(false);
    expect(isSourceConflicting({ content: 'a' }, 'b')).toBe(true);
  });
});

describe('planning dated lines', () => {
  it('appends a fact after the last position and learns it today', () => {
    expect(planFactInsert({ op: 'fact.add', slug: SLUG, value: 'Lyon' }, 4, TODAY, NOW)).toEqual({
      entitySlug: SLUG,
      section: 'facts',
      key: null,
      value: 'Lyon',
      position: 5,
      since: null,
      until: null,
      seen: null,
      sourceRef: null,
      inferred: false,
      extra: null,
      raw: null,
      learnedOn: TODAY,
      createdAt: NOW,
    });
  });

  it('keeps every field the caller gave a relation', () => {
    expect(
      planRelationInsert(
        {
          op: 'relation.add',
          from: SLUG,
          verb: 'client',
          to: 'engagements/x',
          position: 2,
          since: '2026',
          until: '2026-10',
          seen: '2026-10-01',
          sourceRef: 'gmail 1',
          inferred: true,
          extra: 'x: y',
          raw: 'r',
          learnedOn: '2026-01-01',
        },
        null,
        TODAY,
        NOW,
      ),
    ).toMatchObject({
      fromSlug: SLUG,
      toSlug: 'engagements/x',
      position: 2,
      inferred: true,
      learnedOn: '2026-01-01',
      extra: 'x: y',
    });
    expect(
      planRelationInsert(
        { op: 'relation.add', from: SLUG, verb: 'client', to: 'x' },
        null,
        TODAY,
        NOW,
      ).position,
    ).toBe(0);
  });
});

describe('planning todos', () => {
  it('adds a todo at the end of its list with today as added day', () => {
    expect(
      planTodoInsert({ op: 'todo.add', list: 'work', text: 'Relire' }, 'uuid-1', 2, TODAY, NOW),
    ).toEqual({
      id: 'uuid-1',
      list: 'work',
      position: 3,
      text: 'Relire',
      done: false,
      dueDate: null,
      commitmentSlug: null,
      sourceRef: null,
      addedOn: TODAY,
      doneOn: null,
      extra: '[]',
      removed: false,
      updatedAt: NOW,
    });
  });

  it('keeps an imported id and never invents the done day of an added todo', () => {
    expect(
      planTodoInsert(
        { op: 'todo.add', list: 'personal', text: 'x', id: 'a1b2c3d4e5', done: true },
        'u',
        null,
        TODAY,
        NOW,
      ),
    ).toMatchObject({ id: 'a1b2c3d4e5', position: 0, doneOn: null });
    expect(
      planTodoInsert(
        {
          op: 'todo.add',
          list: 'personal',
          text: 'x',
          done: true,
          doneOn: '2026-10-01',
          extra: [['k', 'v']],
        },
        'u',
        null,
        TODAY,
        NOW,
      ),
    ).toMatchObject({ doneOn: '2026-10-01', extra: '[["k","v"]]' });
  });

  const OPEN_TODO = {
    id: 'a1',
    list: 'personal',
    position: 0,
    text: 'Relire',
    done: false,
    dueDate: '2026-10-20',
    commitmentSlug: null,
    sourceRef: null,
    addedOn: '2026-10-01',
    doneOn: null,
    extra: '[]',
    removed: false,
    updatedAt: NOW,
  };

  it('sets the done day to today when checked without one, and clears it when unchecked', () => {
    expect(
      planTodoUpdate(OPEN_TODO, { op: 'todo.update', id: 'a1', done: true }, TODAY, NOW),
    ).toMatchObject({ done: true, doneOn: TODAY });
    expect(
      planTodoUpdate(
        OPEN_TODO,
        { op: 'todo.update', id: 'a1', done: true, doneOn: '2026-10-02' },
        TODAY,
        NOW,
      ).doneOn,
    ).toBe('2026-10-02');
    expect(
      planTodoUpdate(
        { ...OPEN_TODO, done: true, doneOn: '2026-10-03' },
        { op: 'todo.update', id: 'a1', text: 'Relire vite' },
        TODAY,
        NOW,
      ),
    ).toMatchObject({ text: 'Relire vite', doneOn: '2026-10-03' });
    expect(
      planTodoUpdate(
        { ...OPEN_TODO, done: true, doneOn: '2026-10-03' },
        { op: 'todo.update', id: 'a1', done: false },
        TODAY,
        NOW,
      ).doneOn,
    ).toBeNull();
  });

  it('clears the due date on null and keeps it when absent', () => {
    expect(
      planTodoUpdate(OPEN_TODO, { op: 'todo.update', id: 'a1', dueDate: null }, TODAY, NOW).dueDate,
    ).toBeNull();
    expect(planTodoUpdate(OPEN_TODO, { op: 'todo.update', id: 'a1' }, TODAY, NOW).dueDate).toBe(
      '2026-10-20',
    );
  });
});

describe('planFocusSlots', () => {
  it('fills the three ranks, blanking the ones the new focus leaves empty', () => {
    expect(
      planFocusSlots({
        op: 'focus.replace',
        items: [{ title: 'Atelier Acme', why: 'date', horizon: '2026-10-20' }],
      }),
    ).toEqual([
      { rank: 1, title: 'Atelier Acme', why: 'date', horizon: '2026-10-20' },
      { rank: 2, title: '', why: null, horizon: null },
      { rank: 3, title: '', why: null, horizon: null },
    ]);
  });
});

const STATUS_KEY = 'statut';
const SENT_ON_KEY = 'envoye';
const TYPE_KEY = 'type';

describe('planning statuses', () => {
  it('writes the new status into the front matter attributes', () => {
    expect(
      JSON.parse(planStatusAttributes('{"type":"proposition","statut":"proposee"}', 'acceptee')),
    ).toEqual({
      [TYPE_KEY]: 'proposition',
      [STATUS_KEY]: 'acceptee',
    });
  });

  it('dates a sent draft and records the day in its attributes', () => {
    const plan = planDraftStatus(
      { sentOn: null, attributes: '{"statut":"pret","envoye":""}' },
      'envoye',
      '2026-10-08',
    );
    expect(plan.sentOn).toBe('2026-10-08');
    expect(JSON.parse(plan.attributes)).toEqual({
      [STATUS_KEY]: 'envoye',
      [SENT_ON_KEY]: '2026-10-08',
    });
  });

  it('adds the sending day to a draft whose front matter had none', () => {
    const plan = planDraftStatus({ sentOn: null, attributes: '{}' }, 'envoye', '2026-10-08');
    expect(JSON.parse(plan.attributes)).toEqual({
      [STATUS_KEY]: 'envoye',
      [SENT_ON_KEY]: '2026-10-08',
    });
  });

  it('keeps the known sending day when none is given again', () => {
    const plan = planDraftStatus(
      { sentOn: '2026-10-07', attributes: '{"statut":"envoye","envoye":"2026-10-07"}' },
      'envoye',
      undefined,
    );
    expect(plan.sentOn).toBe('2026-10-07');
  });

  it('empties the sending day of a draft put back to ready', () => {
    const plan = planDraftStatus(
      { sentOn: '2026-10-07', attributes: '{"statut":"envoye","envoye":"2026-10-07"}' },
      'pret',
      undefined,
    );
    expect(plan.sentOn).toBeNull();
    expect(JSON.parse(plan.attributes)).toEqual({ [STATUS_KEY]: 'pret', [SENT_ON_KEY]: '' });
  });

  it('adds no sending day to a draft that never had one', () => {
    const plan = planDraftStatus(
      { sentOn: null, attributes: '{"statut":"pret"}' },
      'abandonne',
      undefined,
    );
    expect(JSON.parse(plan.attributes)).toEqual({ [STATUS_KEY]: 'abandonne' });
  });
});
