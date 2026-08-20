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
  readonly fastestLapSlugs?: ReadonlySet<string>;
  readonly onChipSelect?: (entry: RankedRunnerDto) => void;
  readonly locale: string;
}

const EMPTY_FASTEST_LAP_SLUGS: ReadonlySet<string> = new Set();
const NO_SELECTION = () => undefined;

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
    <div className="[column-width:170px] [column-fill:balance] gap-x-2 px-3 py-2">
      <Show when={ranked.length === 0}>
        <div className="px-5 py-4 text-ink-3">{t('leaderboard.empty')}</div>
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
