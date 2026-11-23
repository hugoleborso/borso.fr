/** @Feature streaks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import type { JokerPip } from './flame-week.core';
import { JOKER_PIP_CLASS } from './flame-week.variants';

export interface JokersCardProps {
  readonly pips: readonly JokerPip[];
  readonly jokersLeft: number;
  readonly jokersPerWeek: number;
}

// @FollowsBlueprint molecule-presentational
export function JokersCard({ pips, jokersLeft, jokersPerWeek }: JokersCardProps): JSX.Element {
  const { t } = useTranslation();
  const title = t('streaks.jokersTitle', { left: jokersLeft, total: jokersPerWeek });
  return (
    <Card aria-label={title} role="group" className="flex flex-col gap-2 px-4 py-3">
      <span className="text-meta font-semibold text-ink">{title}</span>
      <div className="flex items-start gap-3">
        {pips.map((pip) => (
          <span key={pip.id} data-joker={pip.kind} className="flex flex-col items-center gap-1">
            <span aria-hidden="true" className={JOKER_PIP_CLASS[pip.kind]} />
            {pip.weekdayName === null ? null : (
              <span className="text-label text-ink-soft">{pip.weekdayName}</span>
            )}
          </span>
        ))}
        <span className="ml-auto self-center text-meta text-ink-soft">
          {t('streaks.jokersBack')}
        </span>
      </div>
    </Card>
  );
}
