import type { HTMLAttributes, JSX } from 'react';
import { type ChipVariantProps, chipVariants } from './chip.variants';
import { composeClassName } from './class-name.utils';

export interface ChipProps extends HTMLAttributes<HTMLElement>, ChipVariantProps {
  readonly pressed?: boolean;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
}

// @FollowsBlueprint atom-variant
export function Chip({
  className,
  tone,
  size,
  pressed,
  onPress,
  disabled,
  ...rest
}: ChipProps): JSX.Element {
  if (onPress === undefined) {
    return <span className={composeClassName(chipVariants({ tone, size }), className)} {...rest} />;
  }
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onPress}
      className={composeClassName(
        chipVariants({ tone: tone ?? 'choice', size: size ?? 'md' }),
        className,
      )}
      {...rest}
    />
  );
}
