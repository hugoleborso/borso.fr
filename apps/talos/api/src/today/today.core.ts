import { splitFrontMatter } from '@domain/front-matter.core';
import { readSection, stripMarkdownExtension } from '@domain/markdown-page.core';
import type { Todo } from '@domain/todo.core';

export interface Brief {
  readonly date: string;
  readonly markdown: string;
}

export interface ActivityEntry {
  readonly date: string;
  readonly heading: string;
}

const MAXIMUM_UNDATED_TODOS = 5;
const MAXIMUM_ACTIVITY_ENTRIES = 6;
const BRIEF_HEADING = 'Brief envoyé';
const LINE_BREAK = '\n';
const SECTION_PREFIX = '## ';
const REFERENCE_DECORATION_PATTERN = /^\[\[|\]\]$|^\/+/g;

type DatedTodo = Todo & { readonly dueDate: string };

function isDated(todo: Todo): todo is DatedTodo {
  return todo.dueDate !== undefined;
}

// @FollowsBlueprint core-projection
export function selectTodayTodos(todos: readonly Todo[], horizon: string): Todo[] {
  const open = todos.filter((todo) => !todo.done);
  const dueSoon = open
    .filter(isDated)
    .filter((todo) => todo.dueDate.localeCompare(horizon) <= 0)
    .toSorted((left, right) => left.dueDate.localeCompare(right.dueDate));
  const undated = open.filter((todo) => !isDated(todo)).slice(0, MAXIMUM_UNDATED_TODOS);
  return [...dueSoon, ...undated];
}

function normalizeCommitmentReference(reference: string): string {
  return stripMarkdownExtension(reference.trim().replaceAll(REFERENCE_DECORATION_PATTERN, ''));
}

export function selectUnclaimedCommitments<Commitment extends { readonly path: string }>(
  commitments: readonly Commitment[],
  todos: readonly Pick<Todo, 'commitment'>[],
): Commitment[] {
  const claimed = new Set(
    todos
      .map((todo) => todo.commitment)
      .filter((reference) => reference !== undefined)
      .map(normalizeCommitmentReference),
  );
  return commitments.filter((commitment) => !claimed.has(commitment.path));
}

export function readBrief(date: string, journal: string): Brief | null {
  const markdown = readSection(splitFrontMatter(journal).body, BRIEF_HEADING);
  return markdown === null ? null : { date, markdown };
}

function listJournalHeadings(journal: string): string[] {
  return splitFrontMatter(journal)
    .body.split(LINE_BREAK)
    .filter((line) => line.startsWith(SECTION_PREFIX))
    .map((line) => line.slice(SECTION_PREFIX.length).trim())
    .filter((heading) => heading !== '' && heading !== BRIEF_HEADING);
}

export function selectRecentActivity(
  journals: readonly { readonly date: string; readonly journal: string }[],
): ActivityEntry[] {
  return journals
    .flatMap(({ date, journal }) =>
      listJournalHeadings(journal)
        .toReversed()
        .map((heading) => ({ date, heading })),
    )
    .slice(0, MAXIMUM_ACTIVITY_ENTRIES);
}

export function buildJournalPath(date: string): string {
  return `journal/${date}.md`;
}
