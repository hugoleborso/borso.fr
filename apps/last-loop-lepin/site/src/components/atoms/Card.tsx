import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  readonly children: ReactNode;
  /** Extra class appended to `card`, e.g. `countdown-card` on the spectator grid. */
  readonly modifier?: string;
}

// @FollowsBlueprint atom-plain
export function Card({ children, modifier = '' }: CardProps) {
  return <div className={`card ${modifier}`.trimEnd()}>{children}</div>;
}

interface CardBodyProps {
  readonly children: ReactNode;
  /** Extra classes appended to `card-body`, e.g. `col`, `flush`, `muted`. */
  readonly modifier?: string;
  readonly style?: CSSProperties;
}

export function CardBody({ children, modifier = '', style }: CardBodyProps) {
  return (
    <div className={`card-body ${modifier}`.trimEnd()} style={style}>
      {children}
    </div>
  );
}
