import clsx from 'clsx';
import type { ReactNode } from 'react';
import {
  BUTTON_BASE_CLASS,
  BUTTON_CLASS_BY_JUSTIFY,
  BUTTON_CLASS_BY_SIZE,
  BUTTON_CLASS_BY_VARIANT,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles';

interface ButtonLinkProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

// @FollowsBlueprint atom-lookup-variants
export function ButtonLink({
  href,
  children,
  variant = 'default',
  size = 'default',
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={clsx(
        BUTTON_BASE_CLASS,
        BUTTON_CLASS_BY_VARIANT[variant],
        BUTTON_CLASS_BY_SIZE[size],
        BUTTON_CLASS_BY_JUSTIFY.center,
      )}
    >
      {children}
    </a>
  );
}
