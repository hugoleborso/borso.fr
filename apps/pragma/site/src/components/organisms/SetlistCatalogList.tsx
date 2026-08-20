/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
import type { IndexSession, SetlistIndexRow } from '../../lib/setlist-index.core';
import { SetlistSummaryRow } from '../molecules/SetlistSummaryRow';

interface SetlistCatalogListProps {
  readonly rows: readonly SetlistIndexRow<IndexSession>[];
}

// @FollowsBlueprint organism-presentational
export function SetlistCatalogList({ rows }: SetlistCatalogListProps): JSX.Element {
  const { t, i18n } = useTranslation();

  if (rows.length === 0) {
    return <p className="text-ink-400 italic text-sm">{t('setlist.indexEmpty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.id}>
          <SetlistSummaryRow
            id={row.id}
            name={row.name}
            songCount={row.songCount}
            sessionsLabel={describeSessions(row.sessions, i18n.language, t('setlist.noSession'))}
          />
        </li>
      ))}
    </ul>
  );
}

function describeSessions(
  sessions: readonly IndexSession[],
  language: string,
  noSessionLabel: string,
): string {
  if (sessions.length === 0) return noSessionLabel;
  return sessions
    .map((session) => session.venue ?? formatSessionDate(session.date, language))
    .join(' · ');
}
