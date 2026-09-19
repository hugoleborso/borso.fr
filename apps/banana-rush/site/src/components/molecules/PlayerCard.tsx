import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MonkeyFace } from '../atoms/MonkeyFace';
import { StashCount } from '../atoms/StashCount';
import { Chip } from '../atoms/Chip';

export interface PlayerCardProps {
  readonly nickname: string;
  readonly avatar: string;
  readonly stashBananas: number;
  readonly isHost: boolean;
  readonly isYou: boolean;
  readonly hasBid: boolean;
  readonly showBidState: boolean;
}

// @FollowsBlueprint molecule-presentational
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
        'flex items-center gap-3 rounded-chunk border-[3px] border-ink px-3 py-2.5 shadow-chunk-sm',
        isYou ? 'bg-peel-soft' : 'bg-cream',
      )}
    >
      <MonkeyFace avatar={avatar} asleep={showBidState && !hasBid} className="h-11 w-11 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-base font-extrabold">{nickname}</span>
          {isYou ? <Chip tone="peel">{t('common.you')}</Chip> : null}
          {isHost ? <Chip tone="quiet">{t('lobby.host')}</Chip> : null}
        </span>
        {showBidState ? (
          <span className="block text-xs font-bold text-ink-soft">
            {hasBid ? t('game.hasBid') : t('game.thinking')}
          </span>
        ) : null}
      </span>
      <StashCount count={stashBananas} className="shrink-0 text-lg" iconClassName="h-5 w-5" />
    </li>
  );
}
