import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { type IconButtonVariantProps, iconButtonVariants } from './button.variants';
import { composeClassName } from './class-name.utils';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'>,
    IconButtonVariantProps {
  readonly icon: IconName;
  readonly label: string;
}

const ICON_SIZE_BY_BUTTON_SIZE = { sm: 'sm', md: 'md' } as const;

// @FollowsBlueprint atom-variant
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, label, type = 'button', title, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={composeClassName(iconButtonVariants({ variant, size }), className)}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE_BY_BUTTON_SIZE[size ?? 'md']} />
    </button>
  ),
);
IconButton.displayName = 'IconButton';
