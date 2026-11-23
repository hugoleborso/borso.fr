import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { isCompleteJoinCode, JOIN_CODE_LENGTH, normalizeJoinCode } from '@domain/join-code.core';
import { PLAYER_NAME_MAX_LENGTH } from '@domain/player-mark.core';
import { buildGameSearch } from '@site/lib/game-address.core';
import { sortNewestFirst } from '@site/lib/my-games.core';
import { useMe, useMyGames } from '@site/lib/queries/account.queries';
import { useCreateGame } from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { selectCreateErrorKey } from '@site/lib/translation-keys.core';
import {
  canSeatAnother,
  canStartGame,
  replacePlayer,
  type RosterPlayer,
  seatAccount,
  seatPlayer,
  selectAbsentRegulars,
  selectFreeMark,
  selectNewSeatAvatar,
  trimPlayerName,
  unseatPlayer,
  withAccountFirst,
} from '@site/lib/roster.core';
import { loadLastPirate, loadRegulars, saveLastPirate, saveRegulars } from '@site/lib/roster.store';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { TextInput } from '../atoms/TextInput';
import { MyGamesStrip } from '../molecules/MyGamesStrip';
import { RosterMark } from '../molecules/RosterMark';
import { AccountSheet } from './AccountSheet';
import { PirateSheet } from './PirateSheet';

// @FollowsBlueprint organism-form-of-closed-choices
export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createGame = useCreateGame();
  const [regulars] = useState(loadRegulars);
  const [lastPirate, setLastPirate] = useState(loadLastPirate);
  const [table, setTable] = useState<readonly RosterPlayer[]>([]);
  const [isNaming, setIsNaming] = useState(false);
  const [editedSeat, setEditedSeat] = useState<number | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const account = useMe().data ?? null;
  const myGames = useMyGames(account !== null);

  const accountSeat = seatAccount(account, regulars);
  const seated = withAccountFirst(accountSeat, table);
  const absentRegulars = selectAbsentRegulars(regulars, seated);
  const canAdd = canSeatAnother(seated);
  const recentGames = sortNewestFirst(myGames.data ?? []);
  const edited = editedSeat === null ? undefined : table[editedSeat];

  const nameForm = useForm({
    defaultValues: { name: '' },
    onSubmit: ({ value, formApi }) => {
      setTable(
        seatPlayer(table, {
          name: trimPlayerName(value.name),
          ...selectFreeMark(seated),
          avatar: selectNewSeatAvatar(lastPirate, seated),
        }),
      );
      formApi.reset();
      setIsNaming(false);
    },
  });

  const joinForm = useForm({
    defaultValues: { code: '' },
    onSubmit: ({ value }) => {
      const isJoinable = isCompleteJoinCode(value.code);
      if (isJoinable) void navigate(buildGameSearch(value.code, null));
    },
  });

  const startGame = () => {
    createGame.mutate(
      { players: seated, isFirstSeatMine: account !== null },
      {
        onSuccess: (game) => {
          saveRegulars(seated);
          void navigate(buildGameSearch(game.joinCode, 'invite'));
        },
      },
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 pt-14 pb-6">
      <h1 className="m-0 text-center font-display text-6xl leading-none font-normal text-gilt">
        {t('appName')}
      </h1>

      <ul className="m-0 grid list-none grid-cols-4 gap-x-2 gap-y-4 p-0">
        {accountSeat === null ? null : (
          <RosterMark
            player={accountSeat}
            isSeated
            label={t('account.title')}
            onPress={() => {
              setIsAccountOpen(true);
            }}
          />
        )}
        {table.map((player, seat) => (
          <RosterMark
            key={seat}
            player={player}
            isSeated
            label={t('home.editPlayer', { name: player.name })}
            onPress={() => {
              setEditedSeat(seat);
            }}
          />
        ))}
        {canAdd
          ? absentRegulars.map((regular) => (
              <RosterMark
                key={regular.name}
                player={regular}
                isSeated={false}
                label={t('home.addRegular', { name: regular.name })}
                onPress={() => {
                  setTable(seatPlayer(table, regular));
                }}
              />
            ))
          : null}
        {canAdd ? (
          <li className="flex flex-col items-center">
            <Button
              variant="dashed"
              aria-label={t('home.addPlayer')}
              aria-expanded={isNaming}
              onClick={() => {
                setIsNaming(true);
              }}
            >
              <Glyph name="plus" className="size-6.5" />
            </Button>
          </li>
        ) : null}
      </ul>

      {isNaming ? (
        <form
          className="m-0 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void nameForm.handleSubmit();
          }}
        >
          <nameForm.Field name="name">
            {(field) => (
              <label className="flex min-w-0 flex-1">
                <span className="sr-only">{t('home.playerName')}</span>
                <TextInput
                  // eslint-disable-next-line jsx-a11y-js/no-autofocus -- the field appears because the player just tapped the add button, so the keyboard is what they asked for
                  autoFocus
                  value={field.state.value}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  placeholder={t('home.playerName')}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                  }}
                  className="flex-1"
                />
              </label>
            )}
          </nameForm.Field>
          <Button type="submit" variant="outline" aria-label={t('home.confirmName')}>
            <Glyph name="check" strokeWidth={2.5} />
          </Button>
        </form>
      ) : null}

      {recentGames.length === 0 ? null : (
        <MyGamesStrip
          games={recentGames}
          onOpen={(code) => {
            void navigate(buildGameSearch(code, null));
          }}
        />
      )}

      <div className="mt-auto flex flex-col gap-4">
        <ErrorNote code={readRejectionCode(createGame.error)} selectKey={selectCreateErrorKey} />
        <Button
          variant="primary"
          disabled={!canStartGame(seated) || createGame.isPending}
          onClick={startGame}
          className="w-full"
        >
          <Glyph name="play" />
          {t('home.play')}
        </Button>

        <form
          className="m-0 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void joinForm.handleSubmit();
          }}
        >
          <joinForm.Field name="code">
            {(field) => (
              <label className="flex min-w-0 flex-1">
                <span className="sr-only">{t('home.joinCode')}</span>
                <TextInput
                  value={field.state.value}
                  maxLength={JOIN_CODE_LENGTH}
                  autoCapitalize="characters"
                  placeholder={t('home.joinPlaceholder')}
                  onChange={(event) => {
                    field.handleChange(normalizeJoinCode(event.target.value));
                  }}
                  className="flex-1 text-center tracking-[0.3em] uppercase"
                />
              </label>
            )}
          </joinForm.Field>
          {account === null ? (
            <Button
              variant="surface"
              size="large"
              aria-label={t('account.title')}
              onClick={() => {
                setIsAccountOpen(true);
              }}
            >
              <Glyph name="key" />
            </Button>
          ) : null}
          <joinForm.Subscribe selector={(state) => isCompleteJoinCode(state.values.code)}>
            {(canJoin) => (
              <Button
                type="submit"
                variant="outline"
                aria-label={t('home.join')}
                disabled={!canJoin}
              >
                <Glyph name="arrow" strokeWidth={2.2} />
              </Button>
            )}
          </joinForm.Subscribe>
        </form>
      </div>

      {isAccountOpen ? (
        <AccountSheet
          account={accountSeat}
          suggestedMark={{
            name: '',
            ...selectFreeMark(table),
            avatar: selectNewSeatAvatar(lastPirate, table),
          }}
          onClose={() => {
            setIsAccountOpen(false);
          }}
        />
      ) : null}

      {edited === undefined || editedSeat === null ? null : (
        <PirateSheet
          key={editedSeat}
          player={edited}
          onChange={(player) => {
            setTable(replacePlayer(table, editedSeat, player));
            setLastPirate(player.avatar);
            saveLastPirate(player.avatar);
          }}
          onRemove={() => {
            setTable(unseatPlayer(table, editedSeat));
            setEditedSeat(null);
          }}
          onClaim={null}
          onClose={() => {
            setEditedSeat(null);
          }}
        />
      )}
    </div>
  );
}
