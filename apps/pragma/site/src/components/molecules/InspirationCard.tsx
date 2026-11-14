/** @Feature inspirations */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DETAIL_SEPARATOR,
  type InspirationCardView,
} from '../../routes/inspirations/inspirations-page.core';
import { AlbumCover } from '../atoms/AlbumCover';
import { IconButton } from '../atoms/IconButton';

export interface InspirationCardProps {
  readonly card: InspirationCardView;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

const DETAIL_CLASS = 'm-0 text-meta text-ink-soft';

// @FollowsBlueprint molecule-presentational
export function InspirationCard({ card, onEdit, onDelete }: InspirationCardProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <article className="flex items-start gap-3 rounded-md border border-rule bg-leaf px-3 py-2">
      <AlbumCover title={card.title} deezerAlbumId={card.deezerAlbumId} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="m-0 truncate text-body font-medium text-ink">{card.title}</h2>
        <p className={DETAIL_CLASS}>{card.detailLabel}</p>
        {card.note.length === 0 ? null : (
          <p className="m-0 text-meta whitespace-pre-wrap text-ink">{card.note}</p>
        )}
        <p className={DETAIL_CLASS}>
          {card.authorName ?? t('inspirations.formerMember')}
          {DETAIL_SEPARATOR}
          {t('inspirations.usedBy', { count: card.sketchCount })}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        <IconButton
          icon="edit"
          size="sm"
          label={t('inspirations.editFor', { title: card.title })}
          onClick={onEdit}
        />
        <IconButton
          icon="trash"
          size="sm"
          variant="danger"
          label={t('inspirations.deleteFor', { title: card.title })}
          onClick={onDelete}
        />
      </div>
    </article>
  );
}
