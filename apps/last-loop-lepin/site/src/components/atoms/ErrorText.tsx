import type { CSSProperties, ReactNode } from 'react';

interface ErrorTextProps {
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

// @FollowsBlueprint atom-plain
export function ErrorText({ children, style }: ErrorTextProps) {
  return (
    <div className="error-text" style={style}>
      {children}
    </div>
  );
}
