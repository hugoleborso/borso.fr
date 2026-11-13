import { Icon, type IconName } from '@/components/atoms/Icon';

interface IconButtonProps {
  label: string;
  icon: IconName;
  onActivate: () => void;
}

// @FollowsBlueprint molecule-presentational
export function IconButton({ label, icon, onActivate }: IconButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center size-12 shrink-0 rounded-md text-ink hover:bg-surface"
      aria-label={label}
      title={label}
      onClick={onActivate}
    >
      <Icon name={icon} />
    </button>
  );
}
