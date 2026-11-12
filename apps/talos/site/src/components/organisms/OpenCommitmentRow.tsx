import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CommitmentRow } from '../molecules/CommitmentRow';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { addDaysToIsoDay, DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { buildCommitmentHref, selectPageName } from '../../lib/wikilinks.core';
import { type DescribableCommitment, selectCommitmentHeadline } from './commitment-board.core';
import { describeDue, selectDueStatus, selectDueTone } from './todo-list.core';

export interface OpenCommitment extends DescribableCommitment {
  readonly path: string;
  readonly dueDate?: string;
}

export interface OpenCommitmentRowProps {
  readonly commitment: OpenCommitment;
  readonly today: string;
}

function formatDay(isoDay: string): string {
  return formatShortDay(isoDay, DISPLAY_LOCALE);
}

// @FollowsBlueprint organism-presentational
export function OpenCommitmentRow({ commitment, today }: OpenCommitmentRowProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const href = buildCommitmentHref(commitment.path);
  const headline = selectCommitmentHeadline(commitment, selectPageName);
  const status = selectDueStatus(
    { done: false, dueDate: commitment.dueDate },
    today,
    addDaysToIsoDay(today, 1),
  );
  const dueLabel = describeDue(
    commitment.dueDate,
    status,
    (key, date) => t(key, { date }),
    formatDay,
  );
  return (
    <CommitmentRow
      href={href}
      variant={headline.variant}
      lead={headline.lead}
      text={headline.text}
      {...(dueLabel === null ? {} : { dueLabel, dueTone: selectDueTone(status) })}
      onLongPress={() => {
        openActionSheet({
          title: commitment.title,
          subject: { kind: 'commitment', path: commitment.path },
          actions: [
            {
              labelKey: 'discuss.action.open',
              icon: 'open',
              onSelect: () => void navigate(href),
            },
          ],
        });
      }}
    />
  );
}
