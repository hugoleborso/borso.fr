import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { readStashDelta, type RoundStory, selectStoryTone } from '@site/lib/game-summary.core';
import {
  countBananasInFlight,
  planBananaFlight,
  selectRoundSpotlight,
  selectSpotlightStyling,
} from '@site/lib/round-spotlight.core';
import { BananaIcon } from '../atoms/BananaIcon';
import { MonkeyFace } from '../atoms/MonkeyFace';
import { StashCount } from '../atoms/StashCount';

export interface RoundStoryRowProps {
  readonly story: RoundStory;
  readonly isYou: boolean;
}

const NOTHING_MOVED = 0;

/**
 * @Blueprint molecule-outcome-in-one-line
 * @BlueprintName Molecule Outcome In One Line
 * @BlueprintUsage Use where a result has to be readable for everyone at once on a screen that cannot scroll.
 * @BlueprintDescription Carries the outcome in the row's own colour and in one signed number rather than in a wrap of labelled badges, which is what lets eight of these share a phone with the controls underneath. The tint says what happened — a bust, your row, anybody else's — and the sign says how much, so the reader takes both without reading a word; the badges it replaces said the same thing in four times the height and in a language that had to be translated. What a reader loses is the breakdown of crate against tariff, which is recoverable from the bid and the two stashes the row still shows. The two rows the round turned on carry a ring, a one word badge sitting on their own border and the bananas that arrive into them, none of which occupies a pixel of layout: a ring is drawn outside the box, the badge is taken out of the flow and the bananas travel under `position: absolute`, so the same eight rows fit the same band whatever the round did.
 */
export function RoundStoryRow({ story, isYou }: RoundStoryRowProps) {
  const { t } = useTranslation();
  const delta = readStashDelta(story);
  const spotlight = selectRoundSpotlight(story);
  const styling = selectSpotlightStyling(spotlight);
  const flight = planBananaFlight(countBananasInFlight(story, spotlight));

  return (
    <li
      className={clsx(
        'flex min-w-0 items-center gap-1.5 rounded-chunk border-[3px] border-ink px-2 py-1.5 shadow-chunk-sm',
        selectStoryTone(story.busted, isYou),
        styling.emphasis,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {flight.map((banana) => (
          <span
            key={banana.lanePercent}
            className={clsx('absolute top-1 h-5 w-5', styling.flightAnimation)}
            style={{
              left: `${banana.lanePercent}%`,
              animationDelay: `${banana.delayMilliseconds}ms`,
            }}
          >
            <BananaIcon className="h-full w-full" />
          </span>
        ))}
      </span>

      {styling.labelKey === null ? null : (
        <span
          className={clsx(
            'absolute -top-2 left-2 rounded-pill border-2 border-ink px-1.5 text-[0.5rem] font-black uppercase leading-[0.9rem] tracking-wide',
            styling.badgeTone,
          )}
        >
          {t(styling.labelKey)}
        </span>
      )}

      <MonkeyFace avatar={story.avatar} asleep={story.busted} className="h-8 w-8 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold leading-tight">
          {story.nickname}
        </span>
        <span className="block text-[0.625rem] font-bold leading-tight tabular-nums text-ink-soft">
          {story.bid}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <StashCount count={story.stashAfter} className="text-base" iconClassName="h-4 w-4" />
        <span
          className={clsx(
            'block text-[0.625rem] font-extrabold leading-tight tabular-nums',
            delta < NOTHING_MOVED ? 'text-coral' : 'text-ink-soft',
          )}
        >
          {delta > NOTHING_MOVED ? `+${delta}` : delta}
        </span>
      </span>
    </li>
  );
}
