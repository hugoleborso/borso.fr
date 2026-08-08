/**
 * The solid card that rides the pointer inside dnd-kit's `DragOverlay` while a
 * setlist row is being dragged.
 *
 * The in-list row dims to a ghost placeholder at the live insertion slot; this
 * is the piece the operator actually carries, so it stays fully opaque and
 * lifted. It shares nothing with `SetlistEntryRow` beyond the look of the
 * card, which is why it is a component of its own rather than a mode of that
 * one.
 */

import type { JSX } from 'react';
import { Icon } from '../atoms/Icon';

const POSITION_DIGITS = 2;

export interface SetlistEntryDragPreviewProps {
  readonly position: number;
  readonly title: string;
  readonly artist: string;
}

export function SetlistEntryDragPreview(props: SetlistEntryDragPreviewProps): JSX.Element {
  return (
    <div className="grid grid-cols-[32px_auto_1fr] items-center gap-3 bg-bg-elev border border-line-strong rounded-md px-3 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.28)] cursor-grabbing">
      <span className="font-mono text-[11px] text-ink-400 text-right">
        {String(props.position).padStart(POSITION_DIGITS, '0')}
      </span>
      <span className="flex items-center justify-center w-6 h-6 text-ink-500">
        <Icon name="drag" size={16} />
      </span>
      <div className="min-w-0">
        <div className="font-display italic text-[20px] leading-tight text-ink-900 truncate">
          {props.title}
        </div>
        <div className="text-[11.5px] text-ink-500 mt-0.5 truncate">{props.artist}</div>
      </div>
    </div>
  );
}
