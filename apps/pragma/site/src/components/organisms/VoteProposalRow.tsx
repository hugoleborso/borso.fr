/** @Feature setlist-voting */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../atoms/IconButton';
import { PointsBadge } from '../atoms/PointsBadge';

export interface VoteProposalRowProps {
  readonly songId: string;
  readonly title: string;
  readonly points: number;
  readonly position: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onRemove: () => void;
}

// @FollowsBlueprint organism-presentational
export function VoteProposalRow(props: VoteProposalRowProps): JSX.Element {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.songId,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging}
      className="flex items-center gap-2 rounded-lg border border-rule bg-leaf px-3 py-2 touch-none"
    >
      <IconButton
        icon="drag"
        label={t('voting.dragHandle')}
        size="sm"
        className="shrink-0 cursor-grab text-ink-faint"
        {...attributes}
        {...listeners}
      />
      <span className="w-6 text-right tabular-nums text-ink-soft">{props.position + 1}</span>
      <span className="flex-1 min-w-0 truncate text-ink">{props.title}</span>
      <PointsBadge points={props.points} />
      <IconButton
        variant="quiet"
        disabled={props.isFirst}
        onClick={props.onMoveUp}
        icon="chevD"
        label={t('voting.moveUp')}
        className="rotate-180"
      />
      <IconButton
        variant="quiet"
        disabled={props.isLast}
        onClick={props.onMoveDown}
        icon="chevD"
        label={t('voting.moveDown')}
      />
      <IconButton
        variant="quiet"
        onClick={props.onRemove}
        icon="close"
        label={t('voting.removeFromProposal')}
      />
    </li>
  );
}
