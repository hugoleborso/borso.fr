const ICONS = {
  settings: (
    <>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <rect x="14" y="4.5" width="4" height="5" rx="1" />
      <rect x="6" y="14.5" width="4" height="5" rx="1" />
    </>
  ),
  'chevron-right': <path d="M9 5l7 7-7 7" />,
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  'chevrons-right': (
    <>
      <path d="M5 5l7 7-7 7" />
      <path d="M12 5l7 7-7 7" />
    </>
  ),
  'chevrons-left': (
    <>
      <path d="M19 5l-7 7 7 7" />
      <path d="M12 5l-7 7 7 7" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
}

const ICON_PIXELS = 24;

// @FollowsBlueprint atom-icon-registry
export function Icon({ name }: IconProps) {
  return (
    <svg
      width={ICON_PIXELS}
      height={ICON_PIXELS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className="inline-block shrink-0"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
