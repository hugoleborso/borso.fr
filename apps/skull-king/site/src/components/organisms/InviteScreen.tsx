import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { GameView } from '@site/lib/game-view.core';
import { canClaimSeat } from '@site/lib/my-games.core';
import { useClaimSeat, useMe } from '@site/lib/queries/account.queries';
import { useChangePlayer } from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { RosterMark } from '../molecules/RosterMark';
import { ShareButton } from '../molecules/ShareButton';
import { MarkPickerSheet } from './MarkPickerSheet';

export interface InviteScreenProps {
  readonly game: GameView;
  readonly onPlay: () => void;
}

// @FollowsBlueprint organism-query-owning
export function InviteScreen({ game, onPlay }: InviteScreenProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const changePlayer = useChangePlayer(game.joinCode);
  const claimSeat = useClaimSeat(game.joinCode);
  const accountId = useMe().data?.id ?? null;
  const isClaimable = canClaimSeat(game, accountId);
  const [editedId, setEditedId] = useState<string | null>(null);
  const edited = game.players.find((player) => player.id === editedId);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-7 px-4 pt-4 pb-6">
      <Button
        variant="quiet"
        aria-label={t('common.back')}
        onClick={() => {
          void navigate('/');
        }}
      >
        <Glyph name="back" />
      </Button>

      <section className="flex items-center justify-center gap-3">
        <span
          aria-label={t('invite.code', { code: game.joinCode })}
          className="font-sans text-6xl font-black leading-none tracking-[0.15em]"
        >
          {game.joinCode}
        </span>
        <ShareButton joinCode={game.joinCode} size="large" />
      </section>

      <ul className="m-0 grid list-none grid-cols-4 gap-x-2 gap-y-4 p-0">
        {game.players.map((player) => (
          <RosterMark
            key={player.id}
            player={player}
            isSeated
            label={t('home.editPlayer', { name: player.name })}
            onPress={() => {
              setEditedId(player.id);
            }}
          />
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-4">
        <ErrorNote code={readRejectionCode(changePlayer.error ?? claimSeat.error)} />
        <Button variant="primary" className="w-full" onClick={onPlay}>
          <Glyph name="play" />
          {t('common.round', { number: game.currentRound })}
        </Button>
      </div>

      {edited === undefined ? null : (
        <MarkPickerSheet
          key={edited.id}
          player={edited}
          onChange={(player) => {
            changePlayer.mutate({
              playerId: edited.id,
              edit: { name: player.name, icon: player.icon, color: player.color },
            });
          }}
          onRemove={null}
          onClaim={
            isClaimable && accountId !== null
              ? () => {
                  claimSeat.mutate({ playerId: edited.id, accountId });
                }
              : null
          }
          onClose={() => {
            setEditedId(null);
          }}
        />
      )}
    </div>
  );
}
