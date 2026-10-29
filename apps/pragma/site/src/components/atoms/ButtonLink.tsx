import { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import {
  type ButtonVariantProps,
  buttonVariants,
  DEFAULT_BUTTON_VARIANT,
  PHONE_HIDDEN_LABEL_CLASS,
} from './button.variants';
import { composeClassName } from './class-name.utils';
import { Icon, type IconName } from './Icon';

export interface ButtonLinkProps extends LinkProps, ButtonVariantProps {
  readonly icon: IconName;
  readonly iconPosition?: 'start' | 'end';
}

const ICON_SIZE_BY_BUTTON_SIZE = { sm: 'sm', md: 'md', lg: 'lg' } as const;

// @FollowsBlueprint atom-variant
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    { className, variant, size, labelDisplay, icon, iconPosition = 'start', children, ...rest },
    ref,
  ) => {
    const isLabelHiddenOnPhone = labelDisplay === 'wide-only';
    const glyph = <Icon name={icon} size={ICON_SIZE_BY_BUTTON_SIZE[size ?? 'md']} />;
    return (
      <Link
        ref={ref}
        data-variant={variant ?? DEFAULT_BUTTON_VARIANT}
        className={composeClassName(buttonVariants({ variant, size, labelDisplay }), className)}
        {...rest}
      >
        {iconPosition === 'start' ? glyph : null}
        {isLabelHiddenOnPhone ? (
          <span className={PHONE_HIDDEN_LABEL_CLASS}>{children}</span>
        ) : (
          children
        )}
        {iconPosition === 'end' ? glyph : null}
      </Link>
    );
  },
);
ButtonLink.displayName = 'ButtonLink';
