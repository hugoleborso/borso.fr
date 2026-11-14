import { ACTIVE_BUTTON_CLASS, BUTTON_CLASS } from '@/components/atoms/buttonStyles';
import { Icon, type IconName } from '@/components/atoms/Icon';

export type IconButtonVariant = 'plain' | 'outlined' | 'primary';

const CLASS_BY_VARIANT = {
  plain:
    'inline-flex items-center justify-center size-12 shrink-0 rounded-md text-ink hover:bg-surface',
  outlined: BUTTON_CLASS,
  primary: ACTIVE_BUTTON_CLASS,
} as const satisfies Record<IconButtonVariant, string>;

interface IconButtonProps {
  label: string;
  icon: IconName;
  variant?: IconButtonVariant;
  isDisabled?: boolean;
  onActivate: () => void;
}

// @FollowsBlueprint molecule-presentational
export function IconButton({
  label,
  icon,
  variant = 'plain',
  isDisabled = false,
  onActivate,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={CLASS_BY_VARIANT[variant]}
      aria-label={label}
      title={label}
      disabled={isDisabled}
      onClick={onActivate}
    >
      <Icon name={icon} />
    </button>
  );
}
