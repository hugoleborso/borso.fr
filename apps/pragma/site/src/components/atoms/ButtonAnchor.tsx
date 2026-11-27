import type { JSX, ReactNode } from 'react';
import { type ButtonVariantProps, buttonVariants, DEFAULT_BUTTON_VARIANT } from './button.variants';
import { composeClassName } from './class-name.utils';

export interface ButtonAnchorProps extends ButtonVariantProps {
  readonly href: string;
  readonly mark: ReactNode;
  readonly children: ReactNode;
  readonly opensInPlace?: boolean;
  readonly className?: string;
  readonly title?: string;
}

const NEW_TAB_ATTRIBUTES = { target: '_blank', rel: 'noreferrer noopener' } as const;

// @FollowsBlueprint atom-variant
export function ButtonAnchor({
  href,
  mark,
  children,
  variant,
  size,
  opensInPlace = false,
  className,
  title,
}: ButtonAnchorProps): JSX.Element {
  return (
    <a
      href={href}
      title={title}
      {...(opensInPlace ? {} : NEW_TAB_ATTRIBUTES)}
      data-variant={variant ?? DEFAULT_BUTTON_VARIANT}
      className={composeClassName(buttonVariants({ variant, size }), className)}
    >
      {mark}
      {children}
    </a>
  );
}
