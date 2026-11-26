export const CONCERT_PRIZE_ICONS = ['beer', 'gift', 'ticket', 'shirt'] as const;

export type ConcertPrizeIcon = (typeof CONCERT_PRIZE_ICONS)[number];

export const DEFAULT_CONCERT_PRIZE_ICON: ConcertPrizeIcon = 'beer';

export interface ConcertPrize {
  readonly label: string;
  readonly icon: ConcertPrizeIcon;
}

// @FollowsBlueprint core-decision
export function readConcertPrizeIcon(stored: string | null): ConcertPrizeIcon {
  return CONCERT_PRIZE_ICONS.find((icon) => icon === stored) ?? DEFAULT_CONCERT_PRIZE_ICON;
}

export function projectConcertPrize(
  label: string | null,
  storedIcon: string | null,
): ConcertPrize | null {
  if (label === null) return null;
  return { label, icon: readConcertPrizeIcon(storedIcon) };
}
