/** @Feature setlist-voting */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
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
      className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 touch-none"
    >
      <button
        type="button"
        aria-label={t('voting.dragHandle')}
        className="min-h-11 w-8 flex items-center justify-center text-ink-400 bg-transparent border-0 cursor-grab"
        {...attributes}
        {...listeners}
      >
        <Icon name="drag" size={18} />
      </button>
      <span className="w-6 text-right tabular-nums text-ink-400">{props.position + 1}</span>
      <span className="flex-1 min-w-0 truncate text-ink-900">{props.title}</span>
      <PointsBadge points={props.points} />
      <Button
        type="button"
        variant="ghost"
        aria-label={t('voting.moveUp')}
        disabled={props.isFirst}
        onClick={props.onMoveUp}
      >
        ↑
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label={t('voting.moveDown')}
        disabled={props.isLast}
        onClick={props.onMoveDown}
      >
        ↓
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label={t('voting.removeFromProposal')}
        onClick={props.onRemove}
      >
        ×
      </Button>
    </li>
  );
}
