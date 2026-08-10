import type { CSSProperties, ReactNode } from 'react';

export type ButtonVariant = 'default' | 'primary' | 'danger';
export type ButtonSize = 'default' | 'small';

const CLASS_BY_VARIANT: Readonly<Record<ButtonVariant, string>> = {
  default: 'btn',
  primary: 'btn btn-primary',
  danger: 'btn btn-danger',
};

const CLASS_BY_SIZE: Readonly<Record<ButtonSize, string>> = {
  default: '',
  small: ' btn-sm',
};

interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly title?: string;
  readonly style?: CSSProperties;
}

/**
 * @Blueprint atom-lookup-variants
 * @BlueprintName Atom With Lookup Variants
 * @BlueprintUsage Use for a user interface primitive with more than two visual variants in an application that has no Tailwind and no cva.
 * @BlueprintDescription This application styles through hand written CSS files, so it cannot follow `atom-variant`; the same intent lands as one frozen record per variant axis, `CLASS_BY_VARIANT` and `CLASS_BY_SIZE`, each keyed by the prop union so a new variant without a class is a type error. The component indexes both records and concatenates the two results, with no conditional in the markup and no class name assembled from a condition.
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'default',
  size = 'default',
  disabled = false,
  title,
  style,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${CLASS_BY_VARIANT[variant]}${CLASS_BY_SIZE[size]}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
}
