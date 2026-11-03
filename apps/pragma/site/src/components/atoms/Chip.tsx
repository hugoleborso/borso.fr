import type { HTMLAttributes, JSX } from 'react';
import { ToggleButton } from 'react-aria-components';
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
  const choiceClassName = composeClassName(
    chipVariants({ tone: tone ?? 'choice', size: size ?? 'md' }),
    className,
  );
  if (pressed === undefined) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onPress}
        className={choiceClassName}
        {...rest}
      />
    );
  }
  return (
    <ToggleButton
      isSelected={pressed}
      onChange={onPress}
      isDisabled={disabled}
      className={choiceClassName}
      render={(toggleProps) => <button {...rest} {...toggleProps} />}
    >
      {rest.children}
    </ToggleButton>
  );
}
