import clsx from 'clsx';
import {
  ArrowRight,
  ChartColumn,
  Check,
  ChevronLeft,
  Crown,
  KeyRound,
  LogOut,
  type LucideIcon,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Share,
  Trash,
  UserRound,
  UserRoundPlus,
  X,
} from 'lucide-react';

const GLYPHS = {
  play: Play,
  check: Check,
  cross: X,
  plus: Plus,
  arrow: ArrowRight,
  back: ChevronLeft,
  share: Share,
  chart: ChartColumn,
  pencil: Pencil,
  replay: RotateCcw,
  key: KeyRound,
  person: UserRound,
  personAdd: UserRoundPlus,
  signOut: LogOut,
  trash: Trash,
  crown: Crown,
} as const satisfies Record<string, LucideIcon>;

export type GlyphName = keyof typeof GLYPHS;

const FILLS: Partial<Record<GlyphName, 'currentColor'>> = { play: 'currentColor' };

const DEFAULT_STROKE_WIDTH = 2;

export interface GlyphProps {
  readonly name: GlyphName;
  readonly className?: string;
  readonly strokeWidth?: number;
}

// @FollowsBlueprint atom-icon-registry
export function Glyph({ name, className, strokeWidth = DEFAULT_STROKE_WIDTH }: GlyphProps) {
  const Icon = GLYPHS[name];
  return (
    <Icon
      aria-hidden="true"
      fill={FILLS[name] ?? 'none'}
      strokeWidth={strokeWidth}
      className={clsx('shrink-0', className ?? 'size-5.5')}
    />
  );
}
