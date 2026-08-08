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
