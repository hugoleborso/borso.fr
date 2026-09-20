export interface LinkIconProps {
  readonly className?: string;
}

// @FollowsBlueprint atom-plain
export function LinkIcon({ className }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M10 13.5a3.6 3.6 0 0 0 5.2.3l3-3a3.6 3.6 0 0 0-5.1-5.1l-1.3 1.3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M14 10.5a3.6 3.6 0 0 0-5.2-.3l-3 3a3.6 3.6 0 0 0 5.1 5.1l1.3-1.3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
