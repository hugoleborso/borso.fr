import type { JSX, ReactNode } from 'react';
import { type ButtonVariantProps, buttonVariants, DEFAULT_BUTTON_VARIANT } from './button.variants';

export interface ButtonAnchorProps extends ButtonVariantProps {
  readonly href: string;
  readonly mark: ReactNode;
  readonly children: ReactNode;
}

// @FollowsBlueprint atom-variant
export function ButtonAnchor({
  href,
  mark,
  children,
  variant,
  size,
}: ButtonAnchorProps): JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      data-variant={variant ?? DEFAULT_BUTTON_VARIANT}
      className={buttonVariants({ variant, size })}
    >
      {mark}
      {children}
    </a>
  );
}
