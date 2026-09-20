import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MonkeyFace } from '../atoms/MonkeyFace';
import { StashCount } from '../atoms/StashCount';

export interface PlayerCardProps {
  readonly nickname: string;
  readonly avatar: string;
  readonly stashBananas: number;
  readonly isHost: boolean;
  readonly isYou: boolean;
  readonly hasBid: boolean;
  readonly showBidState: boolean;
}

/**
 * @Blueprint molecule-sized-to-the-fullest-table
 * @BlueprintName Molecule Sized To The Fullest Table
 * @BlueprintUsage Use for the repeated row of a list whose length is bounded and whose every entry has to stay on screen.
 * @BlueprintDescription Sized so the largest table the rules allow still fits a short phone beside everything else the screen owes, which is what lets the page refuse to scroll rather than hiding the control at the bottom of it. Nothing here is said twice in two places: being yours is already the row's colour, so a badge saying so would cost a third of the width the name has in a two column grid and truncate it to a letter — which is what it did. The host keeps a mark because nothing else on the row carries it, and it is one glyph with the word behind it for anyone not reading the glyph. Whether a player has bid is carried by the face rather than by a line of text, so the row costs one line at any table size and the state reads at a glance across eight of them.
 */
export function PlayerCard({
  nickname,
  avatar,
  stashBananas,
  isHost,
  isYou,
  hasBid,
  showBidState,
}: PlayerCardProps) {
  const { t } = useTranslation();

  return (
    <li
      className={clsx(
        'flex min-w-0 items-center gap-1.5 rounded-chunk border-[3px] border-ink px-2 py-1.5 shadow-chunk-sm',
        isYou ? 'bg-peel-soft' : 'bg-cream',
      )}
    >
      <MonkeyFace avatar={avatar} asleep={showBidState && !hasBid} className="h-8 w-8 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-extrabold">
        {isHost ? (
          <span className="text-ink-faint">
            <span aria-hidden="true">★ </span>
            <span className="sr-only">{t('lobby.host')}</span>
          </span>
        ) : null}
        {nickname}
      </span>
      <StashCount count={stashBananas} className="shrink-0 text-base" iconClassName="h-4 w-4" />
    </li>
  );
}
