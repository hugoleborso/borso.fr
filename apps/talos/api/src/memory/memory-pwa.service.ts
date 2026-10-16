import { randomUUID } from 'node:crypto';
import { TalosError } from '../helpers/errors/talos-error.types';
import type { ChangeResponse } from './memory-changes-response.core';
import type { ChangeOperation } from './memory-changes.schema';
import { applyChanges } from './memory-changes.service';
import { decodeAttributes, decodeJsonText } from './memory-changes.core';
import { listTodosOf } from './memory-files.repository';
import { readExecutor, findStateByKey } from './memory-search.repository';
import {
  findDraft,
  findProposal,
  findTodo,
  listCommitments,
  listEntities,
  listFocusItems,
  listRelations,
} from './memory.repository';
import { renderRecordPage } from './page-rendering.core';

export { readMemoryPage } from './memory-page.service';
export { searchMemory } from './memory-read.service';

const PWA_ACTOR = 'pwa';
const FOCUS_UPDATED_ON_KEY = 'focus.updated_on';

export type MemoryTodoRow = Awaited<ReturnType<typeof listTodosOf>>[number];
export type MemoryTodoListName = 'personal' | 'work';

export interface MemoryFocus {
  readonly updatedOn: string | null;
  readonly items: readonly {
    readonly title: string;
    readonly why: string | null;
    readonly horizon: string | null;
  }[];
}

export interface MemoryGraphSource {
  readonly entities: readonly {
    readonly slug: string;
    readonly title: string;
    readonly kind: string;
    readonly closeness: number | null;
    readonly archived: boolean;
  }[];
  readonly commitments: readonly {
    readonly slug: string;
    readonly action: string | null;
    readonly body: string;
  }[];
  readonly relations: readonly {
    readonly fromSlug: string;
    readonly verb: string;
    readonly toSlug: string;
    readonly since: string | null;
    readonly until: string | null;
    readonly seen: string | null;
  }[];
}

// @FollowsBlueprint service-orchestration
export async function recordPwaChanges(
  summary: string,
  operations: readonly ChangeOperation[],
  now: Date,
): Promise<ChangeResponse> {
  return await applyChanges(
    {
      idempotencyKey: `${PWA_ACTOR}-${randomUUID()}`,
      actor: PWA_ACTOR,
      summary,
      operations: [...operations],
    },
    { tokenName: null, now },
  );
}

export async function listMemoryTodos(list: MemoryTodoListName): Promise<MemoryTodoRow[]> {
  return await listTodosOf(list);
}

export async function findMemoryTodo(id: string): Promise<MemoryTodoRow | null> {
  return await findTodo(readExecutor(), id);
}

export async function readMemoryFocus(): Promise<MemoryFocus> {
  const [items, updatedOn] = await Promise.all([
    listFocusItems(),
    findStateByKey(FOCUS_UPDATED_ON_KEY),
  ]);
  const storedDate = decodeJsonText(updatedOn?.value ?? null);
  return {
    updatedOn: typeof storedDate === 'string' ? storedDate : null,
    items: items.filter((item) => item.title !== ''),
  };
}

function renderStoredRecord(
  row: { readonly attributes: string; readonly body: string } | null,
): string | null {
  return row === null ? null : renderRecordPage(decodeAttributes(row.attributes), row.body);
}

export async function renderMemoryProposal(slug: string): Promise<string | null> {
  return renderStoredRecord(await findProposal(readExecutor(), slug));
}

export async function renderMemoryDraft(slug: string): Promise<string | null> {
  return renderStoredRecord(await findDraft(readExecutor(), slug));
}

export async function readMemoryGraphSource(): Promise<MemoryGraphSource> {
  const [entities, commitments, relations] = await Promise.all([
    listEntities(),
    listCommitments(),
    listRelations(),
  ]);
  return { entities, commitments, relations };
}

export function readCreatedId(response: ChangeResponse): string {
  const id = response.results[0]?.id;
  if (id === undefined) throw new TalosError('memory-conflict', { message: 'écriture sans id' });
  return id;
}
