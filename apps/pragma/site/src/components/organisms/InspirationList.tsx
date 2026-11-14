/** @Feature inspirations */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { InspirationRecord } from '../../lib/queries/inspirations.queries';
import { projectInspirationCard } from '../../routes/inspirations/inspirations-page.core';
import { InspirationCard } from '../molecules/InspirationCard';

export interface InspirationListProps {
  readonly inspirations: readonly InspirationRecord[];
  readonly onEdit: (inspiration: InspirationRecord) => void;
  readonly onDelete: (inspirationId: string) => void;
}

// @FollowsBlueprint organism-presentational
export function InspirationList({
  inspirations,
  onEdit,
  onDelete,
}: InspirationListProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={t('inspirations.title')}>
      {inspirations.map((inspiration) => (
        <li key={inspiration.id}>
          <InspirationCard
            card={projectInspirationCard(inspiration)}
            onEdit={() => onEdit(inspiration)}
            onDelete={() => onDelete(inspiration.id)}
          />
        </li>
      ))}
    </ul>
  );
}
