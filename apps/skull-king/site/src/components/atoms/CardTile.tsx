import clsx from 'clsx';

const WIDTHS = { regular: 'w-12', small: 'w-11' } as const;

export interface CardTileProps {
  readonly source: string;
  readonly label: string;
  readonly isLit: boolean;
  readonly badge: string | null;
  readonly onPress: () => void;
  readonly isDisabled?: boolean;
  readonly size?: keyof typeof WIDTHS;
}

// @FollowsBlueprint atom-plain
export function CardTile({
  source,
  label,
  isLit,
  badge,
  onPress,
  isDisabled = false,
  size = 'regular',
}: CardTileProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isLit}
      disabled={isDisabled}
      onClick={onPress}
      className={clsx(
        'relative aspect-5/7 shrink-0 cursor-pointer p-0 disabled:cursor-default disabled:opacity-30',
        WIDTHS[size],
      )}
    >
      <img
        src={source}
        alt=""
        className={clsx(
          'block size-full rounded-md object-cover',
          isLit ? 'outline-2 outline-accent' : 'opacity-35 grayscale-70',
        )}
      />
      {badge === null ? null : (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-1.5 text-xs font-extrabold bg-accent text-ink">
          {badge}
        </span>
      )}
    </button>
  );
}
