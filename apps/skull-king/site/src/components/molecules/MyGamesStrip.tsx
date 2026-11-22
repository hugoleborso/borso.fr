import { useTranslation } from 'react-i18next';
import {
  formatGameDate,
  isGameFinished,
  type MyGame,
  selectWinners,
} from '@site/lib/my-games.core';
import { Glyph } from '../atoms/Glyph';
import { PlayerMark } from '../atoms/PlayerMark';

export interface MyGamesStripProps {
  readonly games: readonly MyGame[];
  readonly onOpen: (joinCode: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function MyGamesStrip({ games, onOpen }: MyGamesStripProps) {
  const { t, i18n } = useTranslation();
  return (
    <ul
      aria-label={t('account.myGames')}
      className="m-0 -mx-4 flex list-none gap-2 overflow-x-auto px-4 pb-1"
    >
      {games.map((game) => {
        const isFinished = isGameFinished(game);
        return (
          <li key={game.joinCode} className="shrink-0">
            <button
              type="button"
              aria-label={t('account.openGame', { code: game.joinCode })}
              onClick={() => {
                onOpen(game.joinCode);
              }}
              className="flex min-h-11 w-36 cursor-pointer flex-col gap-2 rounded-tile p-3 text-left bg-surface"
            >
              <span className="flex items-center justify-between text-xs font-semibold text-muted">
                {formatGameDate(game.openedAt, i18n.language)}
                {game.myRank === null ? null : (
                  <span className="font-extrabold text-accent">#{game.myRank}</span>
                )}
              </span>
              <span className="flex flex-wrap gap-1">
                {game.players.map((player) => (
                  <PlayerMark
                    key={player.seat}
                    icon={player.icon}
                    color={player.color}
                    size="tiny"
                  />
                ))}
              </span>
              {isFinished ? (
                <span className="flex items-center gap-1">
                  <Glyph name="crown" className="size-5 text-accent" />
                  {selectWinners(game).map((winner) => (
                    <PlayerMark
                      key={winner.seat}
                      icon={winner.icon}
                      color={winner.color}
                      size="tiny"
                    />
                  ))}
                </span>
              ) : (
                <span className="font-display text-xl leading-none">
                  {t('common.round', { number: game.currentRound })}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
