import { type ButtonHTMLAttributes, forwardRef } from 'react';
import {
  type ButtonVariantProps,
  buttonVariants,
  DEFAULT_BUTTON_VARIANT,
  PHONE_HIDDEN_LABEL_CLASS,
} from './button.variants';
import { composeClassName } from './class-name.utils';
import { Icon, type IconName } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  readonly icon: IconName;
  readonly iconPosition?: 'start' | 'end';
}

const ICON_SIZE_BY_BUTTON_SIZE = { sm: 'sm', md: 'md', lg: 'lg' } as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      labelDisplay,
      icon,
      iconPosition = 'start',
      type = 'button',
      children,
      ...rest
    },
    ref,
  ) => {
    const isLabelHiddenOnPhone = labelDisplay === 'wide-only';
    const glyph = <Icon name={icon} size={ICON_SIZE_BY_BUTTON_SIZE[size ?? 'md']} />;
    return (
      <button
        ref={ref}
        type={type}
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
      </button>
    );
  },
);
Button.displayName = 'Button';
