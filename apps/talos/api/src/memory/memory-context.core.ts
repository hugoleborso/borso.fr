import { measureBytes } from './memory-text.core';

export const DEFAULT_CONTEXT_BUDGET_BYTES = 80_000;
const SUMMARY_LIMIT = 80;
const ELLIPSIS = '…';

export interface ContextDocument {
  readonly slug: string;
  readonly content: string;
}

export interface ContextFocusItem {
  readonly title: string;
  readonly why: string | null;
  readonly horizon: string | null;
}

export interface ContextTodo {
  readonly list: string;
  readonly text: string;
  readonly done: boolean;
  readonly removed: boolean;
  readonly dueDate: string | null;
}

export interface ContextCommitment {
  readonly slug: string;
  readonly status: string;
  readonly action: string | null;
  readonly due: string | null;
}

export interface ContextEvent {
  readonly occurredAt: Date;
  readonly actor: string;
  readonly operation: string;
  readonly objectId: string;
  readonly summary: string;
}

export interface ContextEntity {
  readonly slug: string;
  readonly kind: string;
  readonly title: string;
  readonly summary: string | null;
  readonly closeness: number | null;
  readonly archived: boolean;
}

export interface ContextInput {
  readonly preferences: readonly ContextDocument[];
  readonly focus: readonly ContextFocusItem[];
  readonly todos: readonly ContextTodo[];
  readonly commitments: readonly ContextCommitment[];
  readonly cursors: unknown;
  readonly lastScan: unknown;
  readonly events: readonly ContextEvent[];
  readonly entities: readonly ContextEntity[];
}

function renderTodos(todos: readonly ContextTodo[], list: string): string[] {
  return todos
    .filter((todo) => todo.list === list && !todo.done && !todo.removed)
    .map((todo) => `- ${todo.text}${todo.dueDate === null ? '' : ` (échéance ${todo.dueDate})`}`);
}

function renderFocusItem(focusItem: ContextFocusItem): string {
  const why = focusItem.why === null ? '' : ` — ${focusItem.why}`;
  const horizon = focusItem.horizon === null ? '' : ` | horizon: ${focusItem.horizon}`;
  return `- **${focusItem.title}**${why}${horizon}`;
}

function truncateSummary(summary: string | null): string {
  const flat = (summary ?? '').replaceAll('\n', ' ').trim();
  return flat.length > SUMMARY_LIMIT ? `${flat.slice(0, SUMMARY_LIMIT)}${ELLIPSIS}` : flat;
}

function readCloseness(entity: ContextEntity): number {
  return entity.closeness ?? 0;
}

function compareIndexEntries(left: ContextEntity, right: ContextEntity): number {
  return left.kind.localeCompare(right.kind) || readCloseness(right) - readCloseness(left);
}

function stringifyState(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function listIndexLines(entities: readonly ContextEntity[]): string[] {
  return entities
    .filter((entity) => !entity.archived)
    .toSorted(compareIndexEntries)
    .map(
      (entity) =>
        `- [[${entity.slug}]] (p${entity.closeness === null ? '?' : String(entity.closeness)}) — ${entity.title} : ${truncateSummary(entity.summary)}`,
    );
}

function renderSection(heading: string, lines: readonly string[]): string {
  return [`## ${heading}`, '', ...lines, ''].join('\n');
}

// @FollowsBlueprint core-serializer
export function composeContext(input: ContextInput, now: Date, budgetBytes: number): string {
  const head = [
    `# Contexte Talos (${now.toISOString()})`,
    '',
    renderSection(
      'Préférences',
      input.preferences.map((document) => `### ${document.slug}\n\n${document.content.trim()}\n`),
    ),
    renderSection(
      'Focus',
      input.focus.filter((focusItem) => focusItem.title !== '').map(renderFocusItem),
    ),
    renderSection('Todo', renderTodos(input.todos, 'personal')),
    renderSection('Todo taff', renderTodos(input.todos, 'work')),
    renderSection(
      'Engagements ouverts',
      input.commitments
        .filter((commitment) => commitment.status === 'ouvert')
        .map(
          (commitment) =>
            `- [[${commitment.slug}]] — ${commitment.action ?? ''}${commitment.due === null ? '' : ` (échéance ${commitment.due})`}`,
        ),
    ),
    renderSection('État', [
      `- curseurs : ${stringifyState(input.cursors)}`,
      `- dernier scan : ${stringifyState(input.lastScan)}`,
    ]),
    renderSection(
      'Derniers événements',
      input.events.map(
        (event) =>
          `- ${event.occurredAt.toISOString()} ${event.actor} ${event.operation} ${event.objectId} — ${event.summary}`,
      ),
    ),
    '## Index',
    '',
  ].join('\n');
  const indexLines = listIndexLines(input.entities);
  let used = measureBytes(head);
  let kept = 0;
  for (const line of indexLines) {
    const lineBytes = measureBytes(`${line}\n`);
    if (used + lineBytes > budgetBytes) break;
    used += lineBytes;
    kept += 1;
  }
  const cut = indexLines.length - kept;
  const tail = cut === 0 ? [] : [`… ${String(cut)} entrées coupées pour tenir le budget`];
  return [head, ...indexLines.slice(0, kept), ...tail].join('\n');
}
