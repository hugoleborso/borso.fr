import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

export type CardBodyPadding = 'default' | 'none' | 'even';

const CARD_CLASS = 'flex flex-col overflow-hidden rounded-xl border border-line bg-bg-elev';

const CARD_BODY_CLASS = 'flex-1 overflow-auto';

const CLASS_BY_PADDING: Readonly<Record<CardBodyPadding, string>> = {
  default: 'px-5 py-4',
  none: 'p-0',
  even: 'p-5',
};

interface CardProps {
  readonly children: ReactNode;
  /** Extra utilities for the card frame, e.g. the spectator grid placement. */
  readonly className?: string;
}

// @FollowsBlueprint atom-plain
export function Card({ children, className }: CardProps) {
  return <div className={clsx(CARD_CLASS, className)}>{children}</div>;
}

interface CardBodyProps {
  readonly children: ReactNode;
  readonly padding?: CardBodyPadding;
  readonly className?: string;
  readonly style?: CSSProperties;
}

// @FollowsBlueprint atom-lookup-variants
export function CardBody({ children, padding = 'default', className, style }: CardBodyProps) {
  return (
    <div className={clsx(CARD_BODY_CLASS, CLASS_BY_PADDING[padding], className)} style={style}>
      {children}
    </div>
  );
}
