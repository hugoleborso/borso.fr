import clsx from 'clsx';

const GLYPHS = {
  play: { path: 'M7 4.5v15l12-7.5z', isFilled: true },
  check: { path: 'm5 12 5 5 9-10', isFilled: false },
  cross: { path: 'M6 6l12 12M18 6 6 18', isFilled: false },
  plus: { path: 'M12 5v14M5 12h14', isFilled: false },
  arrow: { path: 'M5 12h14M13 6l6 6-6 6', isFilled: false },
  back: { path: 'm15 6-6 6 6 6', isFilled: false },
  share: {
    path: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
    isFilled: false,
  },
  chart: { path: 'M4 20V10M10 20V4M16 20v-7M22 20H2', isFilled: false },
  pencil: { path: 'M4 20h4L19 9l-4-4L4 16z', isFilled: false },
  bid: { path: 'M3 11l18-7-7 18-2-8z', isFilled: false },
  tricks: { path: 'M7 3h10v14H7zM4 7v14h10', isFilled: false },
  replay: { path: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5', isFilled: false },
  crown: { path: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z', isFilled: false },
  key: {
    path: 'M14.5 9.5a4 4 0 1 0-3 3.9L13 15h2v2h2v2h3v-3l-5.6-5.6c.07-.3.1-.6.1-.9z M7.5 9.5h.01',
    isFilled: false,
  },
  person: { path: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', isFilled: false },
  signOut: { path: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', isFilled: false },
  trash: { path: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', isFilled: false },
} as const;

export type GlyphName = keyof typeof GLYPHS;

export interface GlyphProps {
  readonly name: GlyphName;
  readonly className?: string;
  readonly strokeWidth?: number;
}

// @FollowsBlueprint atom-icon-registry
export function Glyph({ name, className, strokeWidth = 2 }: GlyphProps) {
  const glyph = GLYPHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      fill={glyph.isFilled ? 'currentColor' : 'none'}
      stroke={glyph.isFilled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={clsx('shrink-0', className ?? 'size-5.5')}
    >
      <path d={glyph.path} />
    </svg>
  );
}
