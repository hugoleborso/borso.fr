import type { JSX, ReactNode } from 'react';
import { composeClassName } from './class-name.utils';

export type HintTextTone = 'muted' | 'danger';

const HINT_TEXT_CLASS = 'text-xs';

const CLASS_BY_TONE: Readonly<Record<HintTextTone, string>> = {
  muted: 'text-ink-400 italic',
  danger: 'text-danger',
};

interface HintTextProps {
  readonly tone: HintTextTone;
  /** Set on the danger tone so a screen reader announces the failure. */
  readonly role?: 'alert';
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-lookup-variants
export function HintText({ tone, role, children }: HintTextProps): JSX.Element {
  return (
    <p className={composeClassName(HINT_TEXT_CLASS, CLASS_BY_TONE[tone])} role={role}>
      {children}
    </p>
  );
}
