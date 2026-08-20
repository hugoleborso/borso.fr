import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import {
  BUTTON_BASE_CLASS,
  BUTTON_CLASS_BY_JUSTIFY,
  BUTTON_CLASS_BY_SIZE,
  BUTTON_CLASS_BY_VARIANT,
  type ButtonJustify,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles';

interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly justify?: ButtonJustify;
  readonly disabled?: boolean;
  readonly title?: string;
  readonly testId?: string;
  readonly style?: CSSProperties;
}

/**
 * @Blueprint atom-lookup-variants
 * @BlueprintName Atom With Lookup Variants
 * @BlueprintUsage Use for a user interface primitive with several visual variants, composed without a variant library.
 * @BlueprintDescription Each variant axis is one frozen record keyed by its prop union, declared in the sibling `button-styles.ts` so the component file exports only components, and so a new variant without a class is a type error. `clsx` joins whole class names the Tailwind scanner has already found, which is what a template literal in `className` would defeat.
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'default',
  size = 'default',
  justify = 'center',
  disabled = false,
  title,
  testId,
  style,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        BUTTON_BASE_CLASS,
        BUTTON_CLASS_BY_VARIANT[variant],
        BUTTON_CLASS_BY_SIZE[size],
        BUTTON_CLASS_BY_JUSTIFY[justify],
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-testid={testId}
      style={style}
    >
      {children}
    </button>
  );
}
