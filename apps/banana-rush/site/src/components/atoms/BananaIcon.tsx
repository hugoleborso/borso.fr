export interface BananaIconProps {
  readonly className?: string;
}

// @FollowsBlueprint atom-plain
export function BananaIcon({ className }: BananaIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className ?? 'h-5 w-5'}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 5 q1 15 11 20 q7 4 12 1 q-9 -1 -14 -8 q-5 -7 -4 -13 z"
        fill="#ffd23f"
        stroke="#3b2712"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M7 5 q2 -3 4 -1"
        fill="none"
        stroke="#3b2712"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
