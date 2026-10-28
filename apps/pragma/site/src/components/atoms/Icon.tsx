import type { SVGProps } from 'react';
import { composeClassName } from './class-name.utils';
import { INSTRUMENT_GLYPHS } from './InstrumentGlyphs';

const ICONS = {
  catalog: <path d="M4 5h16M4 12h16M4 19h10" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  song: (
    <>
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
      <path d="M9 17.5V5l11-2v12.5" />
    </>
  ),
  sessions: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  setlist: (
    <>
      <path d="M4 6h12M4 12h16M4 18h10" />
      <circle cx="20" cy="6" r="1.5" fill="currentColor" />
    </>
  ),
  bars: <path d="M3 21V8m6 13V3m6 18v-9m6 9V8" />,
  tasks: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6l1.2 1.2L7.5 4.8M4 12l1.2 1.2L7.5 10.8M4 18l1.2 1.2L7.5 16.8" />
    </>
  ),
  compos: (
    <>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </>
  ),
  members: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3 20c.7-3.2 3.2-5 6-5s5.3 1.8 6 5" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M16 14c2 .3 3.7 1.4 4.5 3.3" />
    </>
  ),
  instr: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
    </>
  ),
  drag: (
    <>
      <circle cx="9" cy="6" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="18" r="1" fill="currentColor" />
      <circle cx="15" cy="6" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="18" r="1" fill="currentColor" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevR: <path d="M9 6l6 6-6 6" />,
  chevL: <path d="M15 6l-9 6 9 6" />,
  chevD: <path d="M6 9l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </>
  ),
  warn: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5M12 18.5v.1" />
    </>
  ),
  cloud: <path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11.5 1.5A4.5 4.5 0 1 1 17 18H7z" />,
  cloudOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M7 18a5 5 0 0 1-1.6-9.7M9 5.6A6 6 0 0 1 18.5 9.5 4.5 4.5 0 0 1 19 18h-2" />
    </>
  ),
  download: <path d="M12 4v12M6 12l6 6 6-6M4 20h16" />,
  upload: <path d="M12 20V8M6 12l6-6 6 6M4 4h16" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4L10 14" />
      <path d="M20 14v6H4V4h6" />
    </>
  ),
  pdf: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M21 16l-5-5-9 9" />
    </>
  ),
  text: <path d="M5 5h14M9 5v14M5 12h8" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  edit: <path d="M14 4l6 6L8 22H2v-6L14 4z" />,
  play: <path d="M6 4l14 8-14 8V4z" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  filter: <path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  moreVertical: (
    <>
      <circle cx="12" cy="6" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="18" r="1.3" fill="currentColor" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M8 10H6v11h12V10h-2" />
    </>
  ),
  addSquare: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  install: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M12 9v6M9 12l3 3 3-3" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  copy: <path d="M9 9h11v11H9zM15 5V4H4v11h1" />,
  chart: <path d="M3 17l5-6 4 3 5-7 4 4M3 21h18" />,
  audience: (
    <>
      <circle cx="6" cy="10" r="2" />
      <circle cx="12" cy="8" r="2.5" />
      <circle cx="18" cy="10" r="2" />
      <path d="M2 19c.5-2.4 2-3.8 4-3.8s3.5 1.4 4 3.8" />
      <path d="M8 19c.4-3 2-4.8 4-4.8s3.6 1.8 4 4.8" />
      <path d="M14 19c.5-2.4 2-3.8 4-3.8s3.5 1.4 4 3.8" />
    </>
  ),
  vote: (
    <>
      <path d="m9 12 2 2 4-4" />
      <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" />
      <path d="M22 19H2" />
    </>
  ),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  star: <path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  home: <path d="M3 12L12 4l9 8M5 10v10h14V10" />,
  beer: (
    <>
      <path d="M5 7h11v13H5z" />
      <path d="M16 9h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M8 11v6M11 11v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.5 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.2 4.1M6.6 6.6A18.2 18.2 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 3-.4" />
    </>
  ),
  arrowR: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  fingerprint: (
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4 M14 13.12c0 2.38 0 6.38-1 8.88 M17.29 21.02c.12-.6.43-2.3.5-3.02 M2 12a10 10 0 0 1 18-6 M2 16h.01 M21.8 16c.2-2 .131-5.354 0-6 M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2 M8.65 22c.21-.66.45-1.32.57-2 M9 6.8a6 6 0 0 1 9 5.2v2" />
  ),
  unlink: (
    <>
      <path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
      <path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
      <path d="M8 2v3M2 8h3M16 19v3M19 16h3" />
    </>
  ),
  expand: (
    <>
      <path d="m15 15 6 6M15 9l6-6M21 16v5h-5M21 8V3h-5M3 16v5h5M3 21l6-6M3 8V3h5M9 9 3 3" />
    </>
  ),
  bulb: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6M10 22h4" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  reorder: <path d="m3 16 4 4 4-4M7 20V4m14 4-4-4-4 4m4-4v16" />,
  swap: <path d="M8 3 4 7l4 4M4 7h16m-4 14 4-4-4-4m4 4H4" />,
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </>
  ),
  camera: (
    <>
      <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" />
    </>
  ),
  ...INSTRUMENT_GLYPHS,
} as const;

export type IconName = keyof typeof ICONS;

export type IconSize = 'sm' | 'md' | 'lg';

const ICON_PIXELS: Readonly<Record<IconSize, number>> = { sm: 16, md: 20, lg: 24 };

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: IconSize;
}

/**
 * @Blueprint atom-icon-registry
 * @BlueprintName Atom Backed By An Icon Registry
 * @BlueprintUsage Use for the single icon atom of an application, so every glyph the interface draws has one home.
 * @BlueprintDescription Keeps every glyph in one `as const` map of SVG bodies and derives the `IconName` union from `keyof typeof ICONS`, so an unknown name is a type error and adding a glyph is one entry rather than a new component. The atom owns the viewBox, the stroke settings and the size, so a caller passes a name instead of markup.
 */
export function Icon({ name, size = 'sm', className, ...rest }: IconProps): JSX.Element {
  return (
    <svg
      width={ICON_PIXELS[size]}
      height={ICON_PIXELS[size]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={composeClassName('inline-block shrink-0', className)}
      aria-hidden="true"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
