import {
  Bell,
  BellOff,
  BookOpen,
  CalendarClock,
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  KeyRound,
  Lightbulb,
  Link2,
  ListTodo,
  LogOut,
  type LucideIcon,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Share,
  Sparkles,
  SquarePlus,
  Sun,
  Trash2,
  TriangleAlert,
  Undo2,
  Waypoints,
  WifiOff,
  X,
} from 'lucide-react';
import type { JSX } from 'react';
import { composeClassName } from './class-name.utils';

const ICONS = {
  today: Sun,
  todo: ListTodo,
  proposals: Lightbulb,
  brain: Waypoints,
  message: MessageSquareText,
  send: Send,
  check: Check,
  plus: Plus,
  close: X,
  search: Search,
  bell: Bell,
  share: Share,
  'square-plus': SquarePlus,
  edit: Pencil,
  back: ChevronLeft,
  chevron: ChevronRight,
  calendar: CalendarClock,
  clock: Clock,
  sparkles: Sparkles,
  link: Link2,
  offline: WifiOff,
  comment: MessageCircle,
  book: BookOpen,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  settings: Settings,
  'sign-out': LogOut,
  passkey: KeyRound,
  remove: Trash2,
  undo: Undo2,
  'bell-off': BellOff,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly className?: string;
}

const DEFAULT_ICON_SIZE = 20;
const DEFAULT_STROKE_WIDTH = 1.75;

// @FollowsBlueprint atom-icon-registry
export function Icon({
  name,
  size = DEFAULT_ICON_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  className,
}: IconProps): JSX.Element {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      className={composeClassName('inline-block shrink-0', className)}
    />
  );
}
