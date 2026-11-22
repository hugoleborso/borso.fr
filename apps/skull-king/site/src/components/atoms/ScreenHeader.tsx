import type { ReactNode } from 'react';

export interface ScreenHeaderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

// @FollowsBlueprint atom-plain
export function ScreenHeader({ title, children }: ScreenHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="m-0 font-display text-5xl leading-none font-normal">{title}</h1>
      {children}
    </div>
  );
}
