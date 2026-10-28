/** @Feature home */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Overline } from '../atoms/Overline';

export interface NextSessionCardProps {
  readonly isConcert: boolean;
  readonly dateLabel: string;
  readonly sessionPath: string;
  readonly venue: string | null;
  readonly setlistName: string | null;
  readonly songCount: number | null;
  readonly totalLabel: string | null;
}

// @FollowsBlueprint organism-presentational
export function NextSessionCard(props: NextSessionCardProps): JSX.Element {
  const { t } = useTranslation();
  const setlistFacts = [
    props.songCount === null ? null : t('setlist.songCount', { count: props.songCount }),
    props.totalLabel,
  ].filter((fact) => fact !== null);
  return (
    <section aria-label={t('home.nextSession')}>
      <Card className="flex flex-col gap-2 p-4">
        <Overline>{t('home.nextSession')}</Overline>
        <div className="flex items-center gap-2 text-label tracking-wider uppercase text-ink-soft">
          <Icon name={props.isConcert ? 'audience' : 'sessions'} />
          {t(props.isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
        </div>
        <Link
          to={props.sessionPath}
          className="-my-2 flex min-h-11 items-center justify-between gap-2 font-display text-title leading-tight text-ink no-underline"
        >
          {props.dateLabel}
          <Icon name="chevR" className="shrink-0 text-ink-faint" />
        </Link>
        {props.venue === null ? null : <div className="text-meta text-ink-soft">{props.venue}</div>}
        {props.setlistName === null ? (
          <p className="m-0 text-meta text-ink-soft">{t('home.noSetlist')}</p>
        ) : (
          <div className="flex min-w-0 items-center gap-2 border-t border-rule pt-2 text-meta text-ink">
            <Icon name="setlist" className="shrink-0 text-ink-soft" />
            <span className="min-w-0 truncate font-medium">{props.setlistName}</span>
            <span className="shrink-0 text-ink-soft">{setlistFacts.join(' · ')}</span>
          </div>
        )}
      </Card>
    </section>
  );
}
