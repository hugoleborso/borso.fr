import { type Focus } from '@domain/focus.core';
import { isProposalPending } from '@domain/proposal.core';
import type { Todo } from '@domain/todo.core';
import { readContentFile } from '../content/content.service';
import { readFocus } from '../focus/focus.service';
import { addDaysToDate, formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { listProposals } from '../proposals/proposals.service';
import { listTodos } from '../todos/todos.service';
import { type Brief, buildJournalPath, readBrief, selectTodayTodos } from './today.core';

const TODO_HORIZON_DAYS = 2;

export interface Today {
  readonly date: string;
  readonly focus: Focus;
  readonly brief: Brief | null;
  readonly todos: Todo[];
  readonly pendingProposalCount: number;
}

// @FollowsBlueprint service-read-model
export async function readToday(now: Date): Promise<Today> {
  const date = formatParisDate(now);
  const [focus, todos, proposals, journal] = await Promise.all([
    readFocus(),
    listTodos(),
    listProposals(undefined),
    readContentFile(buildJournalPath(date)),
  ]);
  return {
    date,
    focus,
    brief: readBrief(date, journal ?? ''),
    todos: selectTodayTodos(todos, addDaysToDate(date, TODO_HORIZON_DAYS)),
    pendingProposalCount: proposals.filter((proposal) => isProposalPending(proposal, date)).length,
  };
}
