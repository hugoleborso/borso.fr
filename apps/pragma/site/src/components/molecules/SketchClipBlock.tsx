/** @Feature sketches */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { JSX } from 'react';
import { isTapKey, type TimelineClip } from '../../routes/compos/sketch-timeline.core';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface SketchClipBlockProps {
  readonly clip: TimelineClip;
  readonly label: string;
  readonly onTap: () => void;
}

const BLOCK_CLASS =
  'absolute inset-y-1 flex min-w-0 cursor-grab items-center gap-1 overflow-hidden rounded-sm ' +
  'border border-accent bg-accent-soft px-1.5 text-meta text-ink touch-manipulation select-none ' +
  'focus-visible:outline-3 focus-visible:outline-focus';

// @FollowsBlueprint molecule-presentational
export function SketchClipBlock({ clip, label, onTap }: SketchClipBlockProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clip.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
      data-clip-id={clip.id}
      data-offset-seconds={clip.offsetSeconds}
      onClick={onTap}
      onKeyUp={(event) => {
        const isTap = isTapKey(event.key);
        if (isTap) onTap();
      }}
      style={{
        left: clip.leftPixels,
        width: clip.widthPixels,
        transform: CSS.Translate.toString(transform),
      }}
      className={composeClassName(BLOCK_CLASS, isDragging && 'z-10 cursor-grabbing shadow-cover')}
    >
      <Icon name="play" className="shrink-0 text-accent" />
      <span className="truncate">{clip.title}</span>
    </div>
  );
}
