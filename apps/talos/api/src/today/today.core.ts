import { splitFrontMatter } from '@domain/front-matter.core';
import { readSection } from '@domain/markdown-page.core';
import type { Todo } from '@domain/todo.core';

export interface Brief {
  readonly date: string;
  readonly markdown: string;
}

const MAXIMUM_TODAY_TODOS = 8;
const BRIEF_HEADING = 'Brief envoyé';

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
  const undated = open.filter((todo) => !isDated(todo));
  return [...dueSoon, ...undated].slice(0, MAXIMUM_TODAY_TODOS);
}

export function readBrief(date: string, journal: string): Brief | null {
  const markdown = readSection(splitFrontMatter(journal).body, BRIEF_HEADING);
  return markdown === null ? null : { date, markdown };
}

export function buildJournalPath(date: string): string {
  return `journal/${date}.md`;
}
