import clsx from 'clsx';
import {
  Anchor,
  ArrowRight,
  Bird,
  ChartColumn,
  Check,
  ChevronLeft,
  Coins,
  Compass,
  Crown,
  KeyRound,
  Layers,
  LogOut,
  type LucideIcon,
  Map as MapIcon,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Share,
  Ship,
  ShipWheel,
  Skull,
  Swords,
  Target,
  Telescope,
  Trash,
  TreePalm,
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
  bid: Target,
  tricks: Layers,
  replay: RotateCcw,
  key: KeyRound,
  person: UserRound,
  personAdd: UserRoundPlus,
  signOut: LogOut,
  trash: Trash,
  skull: Skull,
  anchor: Anchor,
  crown: Crown,
  compass: Compass,
  swords: Swords,
  ship: Ship,
  'ship-wheel': ShipWheel,
  bird: Bird,
  telescope: Telescope,
  map: MapIcon,
  coins: Coins,
  'tree-palm': TreePalm,
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
