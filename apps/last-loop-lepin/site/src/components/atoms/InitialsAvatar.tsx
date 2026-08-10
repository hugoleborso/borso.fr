import type { CSSProperties } from 'react';

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
  className = 'avatar',
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
