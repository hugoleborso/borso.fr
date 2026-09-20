import type { SVGProps } from 'react';
import { composeClassName } from './class-name.utils';

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
  deezer: <path d="M4 16v4M9 12v8M14 8v12M19 4v16" />,
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
  micVocal: (
    <>
      <path d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12" />
      <path d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5" />
      <circle cx="16" cy="7" r="5" />
    </>
  ),
  guitar: (
    <>
      <path d="m11.9 12.1 4.514-4.514" />
      <path d="M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z" />
      <path d="m6 16 2 2" />
      <path d="M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z" />
    </>
  ),
  bass: (
    <>
      <path d="M12.35 13.83C12.3 14.11 12.22 14.97 12.08 15.5C11.94 16.02 11.84 16.57 11.51 16.99C11.18 17.42 10.5 17.67 10.1 18.04C9.7 18.42 9.39 18.77 9.12 19.26C8.84 19.75 8.77 20.53 8.45 20.99C8.13 21.44 7.95 22.06 7.19 21.98C6.43 21.91 4.68 21.34 3.89 20.55C3.11 19.77 2.53 18.02 2.46 17.26C2.39 16.5 3.01 16.32 3.46 15.99C3.92 15.67 4.7 15.6 5.19 15.33C5.68 15.05 6.03 14.74 6.4 14.34C6.78 13.94 7.05 13.22 7.45 12.93C7.86 12.65 8.39 12.67 8.82 12.63C9.25 12.59 9.82 12.69 10.02 12.7" />
      <path d="M12.35 13.83L18.87 7.31" />
      <path d="M10.02 12.7L17.14 5.58" />
      <path d="M17.14 5.58C17.09 5.31 16.59 4.52 16.84 3.95C17.09 3.38 18.09 2.43 18.64 2.15C19.18 1.87 19.64 2.05 20.1 2.28C20.55 2.52 21.17 3.07 21.36 3.55C21.56 4.03 21.68 4.55 21.26 5.18C20.85 5.81 19.27 6.95 18.87 7.31C18.58 7.02 17.43 5.87 17.14 5.58Z" />
      <path d="M17.07 3.72L16.29 3.38" />
      <path d="M18.44 2.35L17.66 2.02" />
    </>
  ),
  piano: (
    <>
      <path d="M10 13v4" />
      <path d="M14 13v4" />
      <path d="M18 13v4" />
      <path d="M2 13h20" />
      <path d="M22 11.5A3.5 3.5 0 0018.5 8a3.52 3.52 0 01-3.173-2A7 7 0 002 9v10a2 2 0 002 2h16a2 2 0 002-2z" />
      <path d="M6 13v4" />
    </>
  ),
  drum: (
    <>
      <path d="m2 2 8 8" />
      <path d="m22 2-8 8" />
      <ellipse cx="12" cy="9" rx="10" ry="5" />
      <path d="M7 13.4v7.9" />
      <path d="M12 14v8" />
      <path d="M17 13.4v7.9" />
      <path d="M2 9v8a10 5 0 0 0 20 0V9" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

/**
 * @Blueprint atom-icon-registry
 * @BlueprintName Atom Backed By An Icon Registry
 * @BlueprintUsage Use for the single icon atom of an application, so every glyph the interface draws has one home.
 * @BlueprintDescription Keeps every glyph in one `as const` map of SVG bodies and derives the `IconName` union from `keyof typeof ICONS`, so an unknown name is a type error and adding a glyph is one entry rather than a new component. The atom owns the viewBox, the stroke settings and the size, so a caller passes a name instead of markup.
 */
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
      className={composeClassName('inline-block shrink-0', className)}
      aria-hidden="true"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
