/**
 * The two presentation decisions the leaderboard makes per chip: whether the
 * chip is tappable, and which utilities its class carries.
 *
 * The out variant repeats the background and the border rather than layering
 * an override on the base, because two utilities setting the same declaration
 * resolve by their order in the built stylesheet and not by their order in the
 * attribute.
 */

export type ChipInteractivity = 'tappable' | 'display-only';

const CHIP_CLASS =
  'relative flex flex-col gap-1 px-3 py-2 mb-2 rounded-lg border [break-inside:avoid] transition-[border-color,background] duration-150 hover:border-ink-mute';

/** The four column grid shared by every runner list outside the chip layout. */
export const RUNNER_ROW_CLASS =
  'grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-3 min-w-0 px-5 py-2.5 border-b border-line-soft';

export const RUNNER_ROW_RANK_CLASS = 'font-mono tabular-nums text-[13px] text-ink-3';

/**
 * Clipped rather than ellipsised: in a narrow column the name collapses to no
 * width and the ellipsis glyph shows up alone, as a stray vertical stroke.
 */
export const RUNNER_ROW_NAME_CLASS = 'overflow-hidden whitespace-nowrap font-medium';

export const RUNNER_ROW_DETAIL_CLASS = 'font-mono text-[12px] text-ink-2';

// @FollowsBlueprint core-view-intent
export function selectChipInteractivity(hasSelectHandler: boolean): ChipInteractivity {
  return hasSelectHandler ? 'tappable' : 'display-only';
}

export function composeChipClassName(isRunnerOut: boolean): string {
  if (isRunnerOut) return `${CHIP_CLASS} opacity-75 bg-chip-out border-danger-line-soft`;
  return `${CHIP_CLASS} bg-bg-elev-2 border-line`;
}

/** Chips are keyed by edition and slug, which is unique across editions. */
export function composeChipKey(editionSlug: string, runnerSlug: string): string {
  return `${editionSlug}-${runnerSlug}`;
}
