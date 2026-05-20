/**
 * Icon atom — single source of truth for every stroke icon used in
 * the UI. Ports the prototype's `icons.jsx` set: stroke-width 1.6,
 * `currentColor` stroke, `none` fill, `round` line caps + joins.
 *
 * Adding a new icon: append an entry to `ICONS` keyed by name; the
 * value is the SVG body (children of `<svg>`). The atom takes care
 * of viewport, stroke, and sizing.
 */

import type { SVGProps } from 'react';
import { cn } from './cn.utils';

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
  filter: <path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  spotify: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 9.5c3-1 7-1 10 .5M7.5 12.5c2.5-.8 6-.6 8.5.8M8 15.5c2-.5 4.5-.4 6.5.6" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M11 9.5l4 2.5-4 2.5v-5z" fill="currentColor" />
    </>
  ),
  install: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M12 9v6M9 12l3 3 3-3" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
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
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, className, ...rest }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block shrink-0', className)}
      aria-hidden="true"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
