import clsx from 'clsx';
import { readStashDelta, type RoundStory, selectStoryTone } from '@site/lib/game-summary.core';
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
 * @BlueprintDescription Carries the outcome in the row's own colour and in one signed number rather than in a wrap of labelled badges, which is what lets eight of these share a phone with the controls underneath. The tint says what happened — a bust, your row, anybody else's — and the sign says how much, so the reader takes both without reading a word; the badges it replaces said the same thing in four times the height and in a language that had to be translated. What a reader loses is the breakdown of crate against tariff, which is recoverable from the bid and the two stashes the row still shows.
 */
export function RoundStoryRow({ story, isYou }: RoundStoryRowProps) {
  const delta = readStashDelta(story);

  return (
    <li
      className={clsx(
        'flex min-w-0 items-center gap-1.5 rounded-chunk border-[3px] border-ink px-2 py-1.5 shadow-chunk-sm',
        selectStoryTone(story.busted, isYou),
      )}
    >
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
