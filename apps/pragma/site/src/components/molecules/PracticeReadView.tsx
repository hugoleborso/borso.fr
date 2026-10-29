/** @Feature sessions */

import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { composeClassName } from '../atoms/class-name.utils';
import { inputVariants } from '../atoms/input.variants';
import { formatSessionDate } from '../../lib/formatters.utils';

export interface PracticeReadViewSession {
  readonly id: string;
  readonly date: string;
  readonly venue: string | null;
  readonly preparedConcertId: string | null;
}

export interface PracticeReadViewProps {
  readonly session: PracticeReadViewSession;
  readonly upcomingConcerts: readonly PracticeReadViewSession[];
  readonly onChangePreparedConcert: (concertId: string | null) => void;
  readonly language: string;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';
const SELECT_ID = 'practice-prepared-concert';

// @FollowsBlueprint organism-presentational
export function PracticeReadView({
  session,
  upcomingConcerts,
  onChangePreparedConcert,
  language,
}: PracticeReadViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card>
      <label htmlFor={SELECT_ID} className={composeClassName(LABEL_CLASS, 'mb-2.5 block')}>
        {t('sessions.preparedConcert')}
      </label>
      <div className="relative">
        <select
          id={SELECT_ID}
          className={composeClassName(inputVariants({ size: 'md' }), 'appearance-none pr-10')}
          value={session.preparedConcertId ?? ''}
          onChange={(event) => {
            const next = event.target.value.length === 0 ? null : event.target.value;
            onChangePreparedConcert(next);
          }}
        >
          <option value="">—</option>
          {upcomingConcerts.map((concert) => (
            <option key={concert.id} value={concert.id}>
              {formatSessionDate(concert.date, language)} — {concert.venue ?? '—'}
            </option>
          ))}
        </select>
        <Icon
          name="chevD"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft"
        />
      </div>
    </Card>
  );
}
