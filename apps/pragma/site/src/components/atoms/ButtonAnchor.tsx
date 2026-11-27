import type { JSX, ReactNode } from 'react';
import {
  type ButtonVariantProps,
  buttonVariants,
  DEFAULT_BUTTON_VARIANT,
  PHONE_HIDDEN_LABEL_CLASS,
} from './button.variants';
import { composeClassName } from './class-name.utils';

export interface ButtonAnchorProps extends ButtonVariantProps {
  readonly href: string;
  readonly mark: ReactNode;
  readonly children: ReactNode;
  readonly opensInPlace?: boolean;
  readonly className?: string;
}

const NEW_TAB_ATTRIBUTES = { target: '_blank', rel: 'noreferrer noopener' } as const;

// @FollowsBlueprint atom-variant
export function ButtonAnchor({
  href,
  mark,
  children,
  variant,
  size,
  labelDisplay,
  opensInPlace = false,
  className,
}: ButtonAnchorProps): JSX.Element {
  const isLabelHiddenOnPhone = labelDisplay === 'wide-only';
  return (
    <a
      href={href}
      {...(opensInPlace ? {} : NEW_TAB_ATTRIBUTES)}
      data-variant={variant ?? DEFAULT_BUTTON_VARIANT}
      className={composeClassName(buttonVariants({ variant, size, labelDisplay }), className)}
    >
      {mark}
      {isLabelHiddenOnPhone ? (
        <span className={PHONE_HIDDEN_LABEL_CLASS}>{children}</span>
      ) : (
        children
      )}
    </a>
  );
}
