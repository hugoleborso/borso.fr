/**
 * Read-only practice detail. The signature affordance is the
 * prepared-concert link; selecting a different concert from the
 * dropdown still mutates the session.
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../../components/atoms/Card';
import { formatSessionDate } from '../../lib/formatters.utils';

export interface PracticeReadViewSession {
  readonly id: string;
  readonly date: string;
  readonly venue: string | null;
  readonly preparedConcertId: string | null;
}

export interface PracticeReadViewProps {
  readonly session: PracticeReadViewSession;
  readonly preparedConcert: PracticeReadViewSession | null;
  readonly upcomingConcerts: readonly PracticeReadViewSession[];
  readonly onChangePreparedConcert: (concertId: string | null) => void;
  readonly language: string;
}

const LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

export function PracticeReadView({
  session,
  preparedConcert,
  upcomingConcerts,
  onChangePreparedConcert,
  language,
}: PracticeReadViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card>
      <div className={`${LABEL_CLASS} mb-2.5`}>{t('sessions.preparedConcert')}</div>
      <select
        id="practice-prepared-concert"
        className="w-full bg-bg-elev border border-line text-ink-900 rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink-700"
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
      {preparedConcert !== null ? (
        <p className="text-sm text-ink-500 mt-2">
          {t('sessions.preparesConcert')}{' '}
          <Link
            to={`/sessions/${preparedConcert.id}`}
            className="text-accent hover:underline"
          >
            {formatSessionDate(preparedConcert.date, language)}
            {preparedConcert.venue !== null ? ` — ${preparedConcert.venue}` : ''}
          </Link>
        </p>
      ) : null}
    </Card>
  );
}
