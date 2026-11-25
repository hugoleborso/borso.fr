/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useGearChecklist } from '../../lib/queries/gear-items.queries';
import { selectGearSummary } from '../../routes/sessions/gear-page.core';
import { Card } from '../atoms/Card';

export interface ConcertGearCardProps {
  readonly sessionId: string;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';

// @FollowsBlueprint organism-query-owning
export function ConcertGearCard({ sessionId }: ConcertGearCardProps): JSX.Element {
  const { t } = useTranslation();
  const gearSummary = selectGearSummary(useGearChecklist(sessionId).data?.items ?? null);
  return (
    <Link
      to={`/sessions/${sessionId}/gear`}
      className="block rounded-lg text-ink no-underline focus-visible:outline-3 focus-visible:outline-focus"
    >
      <Card className="flex flex-col gap-3 hover:bg-hover">
        <div className="flex items-center justify-between gap-3">
          <span className={LABEL_CLASS}>{t('sessions.gear')}</span>
          <span className="font-mono text-meta">
            {gearSummary === null
              ? t('gear.summary.open')
              : t('gear.summary.toFind', { count: gearSummary.counts.to_find })}{' '}
            ›
          </span>
        </div>
        {gearSummary === null ? (
          <span className="text-meta text-ink-soft">{t('gear.summary.empty')}</span>
        ) : (
          <>
            <div className="flex h-1.5 overflow-hidden rounded-sm bg-sunk" aria-hidden="true">
              <span className="bg-ink" style={{ width: `${gearSummary.havePercent}%` }} />
              <span className="bg-ink-faint" style={{ width: `${gearSummary.venuePercent}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-meta text-ink-soft">
              <span>{t('gear.summary.have', { count: gearSummary.counts.have })}</span>
              <span>{t('gear.summary.venue', { count: gearSummary.counts.asked_of_venue })}</span>
              <span className="font-medium text-ink">
                {t('gear.summary.toFind', { count: gearSummary.counts.to_find })}
              </span>
            </div>
          </>
        )}
      </Card>
    </Link>
  );
}
