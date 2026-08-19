import { ACTIVE_BUTTON_CLASS, BUTTON_CLASS } from './buttonStyles';

export type ButtonVariant = 'default' | 'primary';

const CLASS_BY_VARIANT: Record<ButtonVariant, string> = {
  default: BUTTON_CLASS,
  primary: ACTIVE_BUTTON_CLASS,
};

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  isDisabled?: boolean;
  onActivate: () => void;
}

// @FollowsBlueprint atom-lookup-variants
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
