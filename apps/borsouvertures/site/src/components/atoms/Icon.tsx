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
  undo: (
    <>
      <path d="M9 14l-5-5 5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </>
  ),
  restart: (
    <>
      <path d="M4 4v6h6" />
      <path d="M5.5 15a7 7 0 1 0 1.6-7.3L4 10" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" />
      <path d="M3.5 10h17" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
      <rect x="10" y="13" width="4" height="4" fill="currentColor" stroke="none" />
    </>
  ),
  decks: (
    <>
      <rect x="3.5" y="11" width="17" height="9.5" />
      <path d="M6 7h12" />
      <path d="M8.5 3h7" />
    </>
  ),
  stats: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M7 17V12" />
      <path d="M12 17V5" />
      <path d="M17 17V9" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M15.5 8.5l-1.75 5.25-5.25 1.75 1.75-5.25z" />
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
