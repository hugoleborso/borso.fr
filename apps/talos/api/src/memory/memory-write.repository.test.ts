import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { getDatabase } from '../database/client';
import {
  findChangeBatch,
  findCommitment,
  findDocument,
  findDraft,
  findEntity,
  findFact,
  findJournalEntry,
  findLastTodoPosition,
  findProposal,
  findRelation,
  findSource,
  findState,
  findTodo,
  findVerb,
  listCommitments,
  listDocumentsUnder,
  listFactsOf,
  listFocusItems,
  listRecentEvents,
  listRelations,
  listStates,
  listTableRows,
  listTodos,
  listVerbs,
} from './memory.repository';
import {
  searchCommitments,
  searchDocuments,
  searchFacts,
  searchJournalEntries,
  searchSources,
} from './memory-search.repository';
import {
  didInsertCitation,
  insertChangeBatch,
  insertEntity,
  insertEvent,
  insertFact,
  insertRelation,
  insertSource,
  updateEntity,
  updateFact,
  updateRelation,
  upsertCommitment,
  upsertDocument,
  upsertDraft,
  upsertFocusItem,
  upsertJournalEntry,
  upsertProposal,
  upsertState,
  upsertTodo,
  upsertVerb,
} from './memory-write.repository';

const NOW = new Date('2026-10-16T08:00:00Z');
const ALICE = 'second-brain/personnes/alice-martin';
const ACME = 'second-brain/organisations/acme';

// @FollowsBlueprint test-repository-integration
describe('memory write repository', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('writes an entity, updates it and keeps its facts in position order', async () => {
    const database = getDatabase();
    await insertEntity(database, {
      slug: ALICE,
      kind: 'personne',
      title: 'Alice',
      body: '',
      attributes: '{}',
      createdAt: NOW,
      updatedAt: NOW,
    });
    await updateEntity(database, ALICE, { title: 'Alice Martin', version: 2 });
    const second = await insertFact(database, {
      entitySlug: ALICE,
      section: 'facts',
      value: 'Lyon',
      position: 1,
      createdAt: NOW,
    });
    await insertFact(database, {
      entitySlug: ALICE,
      section: 'facts',
      value: 'Acme',
      position: 0,
      createdAt: NOW,
    });
    await updateFact(database, second, { until: '2026-09', section: 'history' });
    expect(await findEntity(database, ALICE)).toMatchObject({ title: 'Alice Martin', version: 2 });
    expect((await listFactsOf(ALICE)).map((fact) => fact.value)).toEqual(['Acme', 'Lyon']);
    expect(await findFact(database, second)).toMatchObject({
      until: '2026-09',
      section: 'history',
    });
    expect((await searchFacts('%lyon%', 5)).map((fact) => fact.id)).toEqual([second]);
  });

  it('writes relations, verbs, sources and citations', async () => {
    const database = getDatabase();
    await upsertVerb(database, { name: 'client', description: 'a', linkLength: 'long' });
    await upsertVerb(database, { name: 'client', description: 'b', linkLength: 'long' });
    const relationId = await insertRelation(database, {
      fromSlug: ACME,
      verb: 'client',
      toSlug: ALICE,
      position: 0,
      createdAt: NOW,
    });
    await updateRelation(database, relationId, { seen: '2026-10-01' });
    await insertSource(database, {
      slug: 'sources/2026/10/04/appel-acme',
      metadata: '{}',
      content: 'Appel avec Acme',
      createdAt: NOW,
    });
    const citation = { entitySlug: ACME, sourceRef: 'gmail 19c56c', createdAt: NOW };
    expect(await didInsertCitation(database, citation)).toBe(true);
    expect(await didInsertCitation(database, citation)).toBe(false);
    expect((await findVerb(database, 'client'))?.description).toBe('b');
    expect((await listVerbs()).length).toBe(1);
    expect((await findRelation(database, relationId))?.seen).toBe('2026-10-01');
    expect((await listRelations()).length).toBe(1);
    expect((await findSource(database, 'sources/2026/10/04/appel-acme'))?.content).toBe(
      'Appel avec Acme',
    );
    expect((await searchSources('%acme%', 5)).length).toBe(1);
  });

  it('upserts commitments, todos, focus items, proposals, drafts, journal, documents and state', async () => {
    const database = getDatabase();
    const commitment = {
      slug: 'engagements/2026-10-05-devis-acme',
      status: 'ouvert',
      action: 'Envoyer le devis',
      attributes: '{}',
      body: '# Devis Acme',
      createdAt: NOW,
      updatedAt: NOW,
    };
    await upsertCommitment(database, commitment);
    await upsertCommitment(database, { ...commitment, status: 'fait' });
    await upsertTodo(database, {
      id: 'a1b2c3d4e5',
      list: 'personal',
      position: 3,
      text: 'Relire le contrat',
      extra: '[]',
      updatedAt: NOW,
    });
    await upsertFocusItem(database, { rank: 1, title: 'Atelier Acme' });
    await upsertFocusItem(database, { rank: 1, title: 'Atelier Acme v2' });
    await upsertProposal(database, {
      slug: 'etat/propositions/2026-10-04-x',
      category: 'action',
      status: 'proposee',
      title: 'X',
      priority: 'haute',
      createdOn: '2026-10-04',
      attributes: '{}',
      body: '## Pourquoi',
      updatedAt: NOW,
    });
    await upsertDraft(database, {
      slug: 'etat/brouillons/2026-10-08-x',
      channel: 'gmail',
      recipients: 'Alice Martin',
      status: 'pret',
      createdOn: '2026-10-08',
      attributes: '{}',
      body: 'Bonjour',
      updatedAt: NOW,
    });
    await upsertJournalEntry(database, {
      slug: 'journal/2026-10-08',
      kind: 'daily',
      content: '# 2026-10-08',
      updatedAt: NOW,
    });
    await upsertDocument(database, {
      slug: 'preferences/redaction',
      content: 'Court.',
      contentType: 'markdown',
      updatedAt: NOW,
    });
    await upsertState(database, { key: 'cutover', value: '"git"', updatedAt: NOW });
    await upsertState(database, { key: 'cutover', value: '"database"', updatedAt: NOW });
    expect((await findCommitment(database, commitment.slug))?.status).toBe('fait');
    expect((await listCommitments()).length).toBe(1);
    expect((await searchCommitments('%devis%', 5)).length).toBe(1);
    expect((await findTodo(database, 'a1b2c3d4e5'))?.text).toBe('Relire le contrat');
    expect(await findLastTodoPosition(database, 'personal')).toBe(3);
    expect(await findLastTodoPosition(database, 'work')).toBeNull();
    expect((await listTodos()).length).toBe(1);
    expect((await listFocusItems()).map((focus) => focus.title)).toEqual(['Atelier Acme v2']);
    expect((await findProposal(database, 'etat/propositions/2026-10-04-x'))?.status).toBe(
      'proposee',
    );
    expect((await findDraft(database, 'etat/brouillons/2026-10-08-x'))?.channel).toBe('gmail');
    expect((await findJournalEntry(database, 'journal/2026-10-08'))?.kind).toBe('daily');
    expect((await searchJournalEntries('%2026-10-08%', 5)).length).toBe(1);
    expect((await findDocument(database, 'preferences/redaction'))?.content).toBe('Court.');
    expect((await listDocumentsUnder('preferences/')).length).toBe(1);
    expect((await searchDocuments('%court%', 5)).length).toBe(1);
    expect((await findState(database, 'cutover'))?.value).toBe('"database"');
    expect((await listStates(['cutover', 'cursors'])).length).toBe(1);
  });

  it('records events newest first and change batches by key', async () => {
    const database = getDatabase();
    for (const minute of [1, 2]) {
      await insertEvent(database, {
        occurredAt: new Date(NOW.getTime() + minute * 60_000),
        actor: 'routine:nuit',
        operation: 'state.set',
        objectType: 'state',
        objectId: `cle-${String(minute)}`,
        summary: 'test',
      });
    }
    await insertChangeBatch(database, {
      idempotencyKey: 'nuit-1',
      actor: 'routine:nuit',
      appliedAt: NOW,
      result: '{}',
    });
    expect((await listRecentEvents(1)).map((event) => event.objectId)).toEqual(['cle-2']);
    expect((await findChangeBatch('nuit-1'))?.actor).toBe('routine:nuit');
    expect(await findChangeBatch('nuit-2')).toBeNull();
    expect((await listTableRows('memory_event')).length).toBe(2);
  });
});
