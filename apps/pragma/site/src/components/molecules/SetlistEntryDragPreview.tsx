/** @Feature setlists */

import type { JSX } from 'react';
import { Icon } from '../atoms/Icon';

const POSITION_DIGITS = 2;

export interface SetlistEntryDragPreviewProps {
  readonly position: number;
  readonly title: string;
  readonly artist: string;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryDragPreview(props: SetlistEntryDragPreviewProps): JSX.Element {
  return (
    <div className="grid grid-cols-[32px_auto_1fr] items-center gap-3 bg-leaf border border-rule-strong rounded-md px-3 py-3 shadow-raised cursor-grabbing">
      <span className="text-meta text-ink-soft text-right tabular-nums">
        {String(props.position).padStart(POSITION_DIGITS, '0')}
      </span>
      <span className="flex items-center justify-center w-6 h-6 text-ink-soft">
        <Icon name="drag" size="sm" />
      </span>
      <div className="min-w-0">
        <div className="font-display text-title text-ink truncate">{props.title}</div>
        <div className="text-meta text-ink-soft mt-0.5 truncate">{props.artist}</div>
      </div>
    </div>
  );
}
