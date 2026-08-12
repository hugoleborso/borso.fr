import clsx from 'clsx';
import type { ReactNode } from 'react';

const ERROR_TEXT_CLASS = 'font-mono text-[12px] text-danger';

interface ErrorTextProps {
  readonly children: ReactNode;
  readonly className?: string;
}

// @FollowsBlueprint atom-plain
export function ErrorText({ children, className }: ErrorTextProps) {
  return <div className={clsx(ERROR_TEXT_CLASS, className)}>{children}</div>;
}
