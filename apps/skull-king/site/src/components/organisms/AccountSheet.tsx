import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PLAYER_NAME_MAX_LENGTH } from '@domain/player-mark.core';
import { useCreateAccount, useSignIn, useSignOut } from '@site/lib/queries/account.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { type RosterPlayer, trimPlayerName } from '@site/lib/roster.core';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { NamedMark } from '../atoms/NamedMark';
import { PlayerMark } from '../atoms/PlayerMark';
import { Sheet } from '../atoms/Sheet';
import { TextInput } from '../atoms/TextInput';
import { MarkPicker } from '../molecules/MarkPicker';

export interface AccountSheetProps {
  readonly account: RosterPlayer | null;
  readonly suggestedMark: RosterPlayer;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-query-owning
export function AccountSheet({ account, suggestedMark, onClose }: AccountSheetProps) {
  const { t } = useTranslation();
  const signIn = useSignIn();
  const signOut = useSignOut();
  const createAccount = useCreateAccount();
  const [draft, setDraft] = useState<RosterPlayer | null>(null);
  const failure = readRejectionCode(signIn.error ?? signOut.error ?? createAccount.error);
  const draftName = trimPlayerName(draft?.name ?? '');

  if (account !== null) {
    return (
      <Sheet label={t('account.title')} onClose={onClose}>
        <NamedMark
          icon={account.icon}
          color={account.color}
          name={account.name}
          size="hero"
          layout="beside"
          nameStyle="headline"
        />
        <ErrorNote code={failure} />
        <Button
          variant="secondary"
          aria-label={t('account.signOut')}
          className="w-full"
          disabled={signOut.isPending}
          onClick={() => {
            signOut.mutate(undefined, { onSuccess: onClose });
          }}
        >
          <Glyph name="signOut" className="size-6" />
        </Button>
      </Sheet>
    );
  }

  if (draft !== null) {
    return (
      <Sheet label={t('account.create')} onClose={onClose}>
        <div className="flex items-center gap-4">
          <PlayerMark icon={draft.icon} color={draft.color} size="hero" />
          <label className="flex min-w-0 flex-1">
            <span className="sr-only">{t('picker.name')}</span>
            <TextInput
              value={draft.name}
              maxLength={PLAYER_NAME_MAX_LENGTH}
              placeholder={t('home.playerName')}
              onChange={(event) => {
                setDraft({ ...draft, name: event.target.value });
              }}
              className="w-full font-display text-3xl font-normal"
            />
          </label>
        </div>
        <MarkPicker
          icon={draft.icon}
          color={draft.color}
          onIcon={(icon) => {
            setDraft({ ...draft, icon });
          }}
          onColor={(color) => {
            setDraft({ ...draft, color });
          }}
        />
        <ErrorNote code={failure} />
        <Button
          variant="primary"
          aria-label={t('account.createWithPasskey')}
          className="w-full"
          disabled={draftName === '' || createAccount.isPending}
          onClick={() => {
            createAccount.mutate({ ...draft, name: draftName }, { onSuccess: onClose });
          }}
        >
          <Glyph name="key" className="size-6" />
        </Button>
      </Sheet>
    );
  }

  return (
    <Sheet label={t('account.title')} onClose={onClose}>
      <ErrorNote code={failure} />
      <div className="flex gap-3">
        <Button
          variant="primary"
          aria-label={t('account.signIn')}
          className="flex-1"
          disabled={signIn.isPending}
          onClick={() => {
            signIn.mutate(undefined, { onSuccess: onClose });
          }}
        >
          <Glyph name="key" className="size-7" />
        </Button>
        <Button
          variant="raised"
          size="huge"
          aria-label={t('account.create')}
          onClick={() => {
            setDraft({ ...suggestedMark, name: '' });
          }}
        >
          <Glyph name="person" className="size-6" />
          <Glyph name="plus" className="size-4" />
        </Button>
      </div>
    </Sheet>
  );
}
