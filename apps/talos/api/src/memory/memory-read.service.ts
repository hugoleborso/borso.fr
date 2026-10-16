import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import { decodeJsonColumns, decodeJsonText } from './memory-changes.core';
import { composeContext } from './memory-context.core';
import {
  buildNeighbourhood,
  findShortestPath,
  type Neighbourhood,
  type PathStep,
} from './memory-graph.core';
import {
  assessReadOnlyQuery,
  describeDatabaseFailure,
  selectReturnedRows,
} from './memory-guards.core';
import { listMemoryIssues, type MemoryIssue } from './memory-lint.core';
import { rankSearchHits, type SearchHit } from './memory-search.core';
import { buildContainsPattern } from './memory-text.core';
import {
  countTableRows,
  listCommitments,
  listDocumentsUnder,
  listEntities,
  listFocusItems,
  listRecentEvents,
  listRelations,
  listStates,
  listTableRows,
  listTodos,
  listVerbs,
  MEMORY_TABLES,
  type MemoryTableName,
} from './memory.repository';
import {
  findDocumentBySlug,
  findStateByKey,
  listKnownSlugs,
  searchAliases,
  searchCommitments,
  searchDocuments,
  searchEntities,
  searchFacts,
  searchJournalEntries,
  searchSources,
} from './memory-search.repository';
import { runReadOnlyQuery } from './memory-sql.repository';

const RECENT_EVENT_COUNT = 30;
const SQL_TIMEOUT_MILLISECONDS = 10_000;
const CUTOVER_KEY = 'cutover';
const DATABASE_CUTOVER = 'database';
const PREFERENCES_PREFIX = 'preferences/';

export interface MemoryStatus {
  readonly cutover: 'git' | 'database';
  readonly counts: Readonly<Record<string, number>>;
  readonly lastEventAt: string | null;
  readonly tokenName: string | null;
}

const COUNTED_TABLES: readonly [string, MemoryTableName][] = [
  ['entities', 'memory_entity'],
  ['facts', 'memory_fact'],
  ['relations', 'memory_relation'],
  ['aliases', 'memory_alias'],
  ['citations', 'memory_citation'],
  ['sources', 'memory_source'],
  ['commitments', 'memory_commitment'],
  ['todos', 'memory_todo'],
  ['proposals', 'memory_proposal'],
  ['drafts', 'memory_draft'],
  ['journalEntries', 'memory_journal_entry'],
  ['documents', 'memory_document'],
  ['events', 'memory_event'],
];

export async function readCutover(): Promise<'git' | 'database'> {
  const state = await findStateByKey(CUTOVER_KEY);
  return decodeJsonText(state?.value ?? null) === DATABASE_CUTOVER ? 'database' : 'git';
}

// @FollowsBlueprint service-read-model
export async function readMemoryStatus(tokenName: string | null): Promise<MemoryStatus> {
  const counts = await Promise.all(
    COUNTED_TABLES.map(async ([label, table]) => [label, await countTableRows(table)] as const),
  );
  const [lastEvent] = await listRecentEvents(1);
  return {
    cutover: await readCutover(),
    counts: Object.fromEntries(counts),
    lastEventAt: lastEvent?.occurredAt.toISOString() ?? null,
    tokenName,
  };
}

export async function composeMemoryContext(budgetBytes: number, now: Date): Promise<string> {
  const [preferences, focus, todos, commitments, states, events, entities] = await Promise.all([
    listDocumentsUnder(PREFERENCES_PREFIX),
    listFocusItems(),
    listTodos(),
    listCommitments(),
    listStates(['cursors', 'last_scan']),
    listRecentEvents(RECENT_EVENT_COUNT),
    listEntities(),
  ]);
  const stateValue = (key: string) =>
    decodeJsonText(states.find((state) => state.key === key)?.value ?? null);
  return composeContext(
    {
      preferences,
      focus,
      todos,
      commitments,
      cursors: stateValue('cursors'),
      lastScan: stateValue('last_scan'),
      events,
      entities,
    },
    now,
    budgetBytes,
  );
}

export async function searchMemory(query: string, limit: number): Promise<SearchHit[]> {
  const pattern = buildContainsPattern(query);
  const [entities, aliases, facts, commitments, sources, journalEntries, documents, titles] =
    await Promise.all([
      searchEntities(pattern, limit),
      searchAliases(pattern, limit),
      searchFacts(pattern, limit),
      searchCommitments(pattern, limit),
      searchSources(pattern, limit),
      searchJournalEntries(pattern, limit),
      searchDocuments(pattern, limit),
      listEntities(),
    ]);
  const entityTitles = new Map(titles.map((entity) => [entity.slug, entity.title]));
  return rankSearchHits(
    { entities, aliases, facts, entityTitles, commitments, sources, journalEntries, documents },
    query,
    limit,
  );
}

export async function readNeighbours(
  slug: string,
  date: string | null,
  depth: number,
): Promise<Neighbourhood> {
  const [entities, relations] = await Promise.all([listEntities(), listRelations()]);
  return buildNeighbourhood(entities, relations, slug, date, depth);
}

export async function readPath(
  from: string,
  target: string,
  date: string | null,
): Promise<PathStep[] | null> {
  return findShortestPath(await listRelations(), from, target, date);
}

export async function runMemoryQuery(query: string) {
  const assessment = assessReadOnlyQuery(query);
  if (assessment.kind === 'refused') {
    throw new TalosError('memory-refused', { message: assessment.reason });
  }
  try {
    const answer = await runReadOnlyQuery(assessment.boundedQuery, SQL_TIMEOUT_MILLISECONDS);
    return { columns: answer.columns, ...selectReturnedRows(answer.rows) };
  } catch (error) {
    throw new TalosError('memory-refused', { message: describeDatabaseFailure(error) });
  }
}

export async function lintMemory(now: Date): Promise<MemoryIssue[]> {
  const [entities, relations, verbs, commitments, todos, knownSlugs] = await Promise.all([
    listEntities(),
    listRelations(),
    listVerbs(),
    listCommitments(),
    listTodos(),
    listKnownSlugs(),
  ]);
  return listMemoryIssues(
    { entities, relations, verbs: verbs.map((verb) => verb.name), commitments, todos, knownSlugs },
    formatParisDate(now),
  );
}

export async function exportMemory(now: Date) {
  const tableNames = Object.keys(MEMORY_TABLES).filter(
    (name): name is MemoryTableName => name in MEMORY_TABLES,
  );
  const tables = await Promise.all(
    tableNames.map(async (name): Promise<[string, Record<string, unknown>[]]> => [
      name,
      (await listTableRows(name)).map((row) => decodeJsonColumns(name, row)),
    ]),
  );
  return { exportedAt: now.toISOString(), tables: Object.fromEntries(tables) };
}

export async function readMemoryDocument(slug: string) {
  const document = await findDocumentBySlug(slug);
  if (document === null)
    throw new TalosError('memory-not-found', { message: `document inconnu : ${slug}` });
  return { slug: document.slug, content: document.content, contentType: document.contentType };
}

export async function readMemoryState(key: string) {
  const state = await findStateByKey(key);
  if (state === null)
    throw new TalosError('memory-not-found', { message: `clé inconnue : ${key}` });
  return { key: state.key, value: decodeJsonText(state.value) };
}
