/** @Feature sessions */

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';

export interface ConcertReadViewSession {
  readonly id: string;
  readonly venue: string | null;
}

export interface ConcertReadViewProps {
  readonly session: ConcertReadViewSession;
  readonly friendsCard: ReactNode;
  readonly gearCard: ReactNode;
}

const LABEL_CLASS = 'text-label tracking-wider uppercase text-ink-soft font-medium';

// @FollowsBlueprint organism-presentational
export function ConcertReadView({
  session,
  friendsCard,
  gearCard,
}: ConcertReadViewProps): JSX.Element {
  const { t } = useTranslation();
  const { venue } = session;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
      <div className="flex flex-col gap-4">
        {friendsCard}
        {gearCard}
      </div>
      <aside className="flex flex-col gap-4">
        <Card variant="sunk">
          <div className={composeClassName(LABEL_CLASS, 'mb-1.5')}>{t('sessions.venue')}</div>
          <div className="font-display text-title text-ink leading-tight">{venue ?? '—'}</div>
        </Card>
      </aside>
    </div>
  );
}
