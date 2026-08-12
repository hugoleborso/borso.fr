import type { CSSProperties } from 'react';

/** The round 32px initials disc used across the admin lists. */
export const INITIALS_AVATAR_CLASS =
  'shrink-0 flex items-center justify-center w-8 h-8 aspect-square rounded-full font-bold text-[12px] text-bg';

interface InitialsAvatarProps {
  readonly initials: string;
  readonly backgroundColor: string;
  /** Defaults to the small round avatar used across the admin lists. */
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly runnerSlug?: string;
  readonly surface?: string;
}

// @FollowsBlueprint atom-plain
export function InitialsAvatar({
  initials,
  backgroundColor,
  className = INITIALS_AVATAR_CLASS,
  style,
  runnerSlug,
  surface,
}: InitialsAvatarProps) {
  return (
    <span
      className={className}
      style={{ ...style, background: backgroundColor }}
      data-runner-slug={runnerSlug}
      data-surface={surface}
    >
      {initials}
    </span>
  );
}
