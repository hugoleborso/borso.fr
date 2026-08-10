import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RankedRunnerDto } from '../../lib/race.types';
import { selectRunnerStatusKind } from '../../lib/runner-status.utils';
import { Show } from '../atoms/Show';
import { LeaderboardChip } from '../molecules/LeaderboardChip';
import {
  type ChipInteractivity,
  composeChipClassName,
  composeChipKey,
  selectChipInteractivity,
} from './leaderboard.utils';

interface ChipWrapperProps {
  readonly className: string;
  readonly onSelect: () => void;
  readonly children: ReactNode;
}

// @FollowsBlueprint component-lookup-table
const WRAPPER_BY_INTERACTIVITY: Readonly<
  Record<ChipInteractivity, (props: ChipWrapperProps) => ReactNode>
> = {
  tappable: ({ className, onSelect, children }) => (
    <button type="button" className={className} data-testid="leaderboard-chip" onClick={onSelect}>
      {children}
    </button>
  ),
  'display-only': ({ className, children }) => <div className={className}>{children}</div>,
};

interface LeaderboardProps {
  readonly ranked: readonly RankedRunnerDto[];
  /** Slugs holding the edition's fastest lap record; each one gets a badge. */
  readonly fastestLapSlugs?: ReadonlySet<string>;
  /**
   * Tap on a chip, handled by the parent. Omitted on screens where chips are
   * not interactive, e.g. the broadcast display, so no inert button catches
   * keyboard focus there.
   */
  readonly onChipSelect?: (entry: RankedRunnerDto) => void;
  readonly locale: string;
}

const EMPTY_FASTEST_LAP_SLUGS: ReadonlySet<string> = new Set();
const NO_SELECTION = () => undefined;

/**
 * The standings, laid out as chips flowing down CSS columns, which gives a
 * masonry look without the experimental grid track value.
 */
// @FollowsBlueprint organism-presentational
export function Leaderboard({
  ranked,
  fastestLapSlugs = EMPTY_FASTEST_LAP_SLUGS,
  onChipSelect,
  locale,
}: LeaderboardProps) {
  const { t } = useTranslation();
  const interactivity = selectChipInteractivity(onChipSelect !== undefined);
  const Wrapper = WRAPPER_BY_INTERACTIVITY[interactivity];
  return (
    <div className="leaderboard-chips">
      <Show when={ranked.length === 0}>
        <div className="card-body muted">{t('leaderboard.empty')}</div>
      </Show>
      {ranked.map((entry) => (
        <Wrapper
          key={composeChipKey(entry.runner.editionSlug, entry.runner.slug)}
          className={composeChipClassName(selectRunnerStatusKind(entry.status) === 'out')}
          onSelect={() => {
            (onChipSelect ?? NO_SELECTION)(entry);
          }}
        >
          <LeaderboardChip
            entry={entry}
            hasFastestLap={fastestLapSlugs.has(entry.runner.slug)}
            locale={locale}
          />
        </Wrapper>
      ))}
    </div>
  );
}
