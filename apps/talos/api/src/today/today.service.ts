import { type Focus } from '@domain/focus.core';
import { isProposalPending } from '@domain/proposal.core';
import type { Todo } from '@domain/todo.core';
import {
  type Commitment,
  type CommitmentCounts,
  countCommitments,
  selectCommitmentsDueBy,
} from '../commitments/commitments.core';
import { listOpenCommitments } from '../commitments/commitments.service';
import { readContentFile } from '../content/content.service';
import { readFocus } from '../focus/focus.service';
import { addDaysToDate, formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { listProposals } from '../proposals/proposals.service';
import { listTodos } from '../todos/todos.service';
import { type LastRuns, parseLastRuns } from './last-runs.core';
import {
  type ActivityEntry,
  type Brief,
  buildJournalPath,
  readBrief,
  selectRecentActivity,
  selectTodayTodos,
} from './today.core';

const AGENDA_HORIZON_DAYS = 7;
const PREVIOUS_DAY = -1;
const LAST_RUNS_PATH = 'etat/dernier-scan.json';

export interface Today {
  readonly date: string;
  readonly focus: Focus;
  readonly brief: Brief | null;
  readonly todos: Todo[];
  readonly commitments: Commitment[];
  readonly commitmentCounts: CommitmentCounts;
  readonly activity: ActivityEntry[];
  readonly lastRuns: LastRuns | null;
  readonly pendingProposalCount: number;
}

// @FollowsBlueprint service-read-model
export async function readToday(now: Date): Promise<Today> {
  const date = formatParisDate(now);
  const yesterday = addDaysToDate(date, PREVIOUS_DAY);
  const horizon = addDaysToDate(date, AGENDA_HORIZON_DAYS);
  const [focus, todos, proposals, commitments, journal, previousJournal, lastRuns] =
    await Promise.all([
      readFocus(),
      listTodos(),
      listProposals(undefined),
      listOpenCommitments(),
      readContentFile(buildJournalPath(date)),
      readContentFile(buildJournalPath(yesterday)),
      readContentFile(LAST_RUNS_PATH),
    ]);
  return {
    date,
    focus,
    brief: readBrief(date, journal ?? ''),
    todos: selectTodayTodos(todos, horizon),
    commitments: selectCommitmentsDueBy(commitments, horizon),
    commitmentCounts: countCommitments(commitments),
    activity: selectRecentActivity([
      { date, journal: journal ?? '' },
      { date: yesterday, journal: previousJournal ?? '' },
    ]),
    lastRuns: lastRuns === null ? null : parseLastRuns(lastRuns),
    pendingProposalCount: proposals.filter((proposal) => isProposalPending(proposal, date)).length,
  };
}
