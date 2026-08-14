import clsx from 'clsx';
import type { ReactNode } from 'react';

export type MonoNoteTracking = 'normal' | 'wide';

const MONO_NOTE_CLASS = 'font-mono tabular-nums text-[11px] text-ink-3';

const CLASS_BY_TRACKING: Readonly<Record<MonoNoteTracking, string>> = {
  normal: '',
  wide: 'tracking-[0.08em]',
};

interface MonoNoteProps {
  readonly tracking?: MonoNoteTracking;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-lookup-variants
export function MonoNote({ tracking = 'normal', children }: MonoNoteProps) {
  return <div className={clsx(MONO_NOTE_CLASS, CLASS_BY_TRACKING[tracking])}>{children}</div>;
}
