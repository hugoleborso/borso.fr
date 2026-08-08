export type ButtonVariant = 'default' | 'primary';

const CLASS_BY_VARIANT: Record<ButtonVariant, string> = {
  default: 'btn',
  primary: 'btn active',
};

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  isDisabled?: boolean;
  onActivate: () => void;
}

export function Button({
  label,
  variant = 'default',
  isDisabled = false,
  onActivate,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={CLASS_BY_VARIANT[variant]}
      disabled={isDisabled}
      onClick={onActivate}
    >
      {label}
    </button>
  );
}
