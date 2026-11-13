import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Modal } from '@/components/atoms/Modal';
import { AccountLink } from '@/components/molecules/AccountLink';
import { BoardStyleSelect } from '@/components/molecules/BoardStyleSelect';
import { IconButton } from '@/components/molecules/IconButton';
import { LanguageSwitcher } from '@/components/molecules/LanguageSwitcher';
import { OpponentStrengthSelect } from '@/components/molecules/OpponentStrengthSelect';
import { SessionExpiredBanner } from '@/components/molecules/SessionExpiredBanner';
import { SignInScreen } from '@/components/organisms/SignInScreen';
import { selectAccountLinkView } from '@/lib/account-session.core';
import { useAccountSession, useSignOut } from '@/lib/queries/account.queries';
import { hasRoomForABand } from '@/navigation/app-screen.core';
import { openScreen, useAppScreen } from '@/navigation/navigation.store';
import { isSessionExpiryShown } from '@/review/sync.core';
import { useSyncStatus } from '@/review/sync.store';
import { useAppState } from '@/state/appState';

// @FollowsBlueprint organism-presentational
export function TopBar() {
  const { t } = useTranslation();
  const { boardStyle, opponentStrength } = useAppState();
  const session = useAccountSession();
  const signOut = useSignOut();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const syncStatus = useSyncStatus();
  const screen = useAppScreen();
  const isSessionExpired =
    isSessionExpiryShown(syncStatus, session.data) && hasRoomForABand(screen);

  function closeSettings(): void {
    setIsSettingsOpen(false);
    setIsSignInOpen(false);
  }

  function openSignIn(): void {
    setIsSettingsOpen(true);
    setIsSignInOpen(true);
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3 h-12">
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em]">
          <span aria-hidden="true" className="size-3 bg-accent" />
          {t('top-bar.brand')}
        </h1>
        <IconButton
          label={t('top-bar.settings')}
          icon="settings"
          onActivate={() => setIsSettingsOpen(true)}
        />
      </header>
      {isSessionExpired ? <SessionExpiredBanner onSignIn={openSignIn} /> : null}
      {isSettingsOpen ? (
        <Modal
          title={t('top-bar.settings')}
          closeLabel={t('top-bar.close-settings')}
          onClose={closeSettings}
        >
          <BoardStyleSelect boardStyle={boardStyle} />
          <LanguageSwitcher />
          <OpponentStrengthSelect strength={opponentStrength} />
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-rule">
            <Button
              label={t('credits.link')}
              onActivate={() => {
                closeSettings();
                openScreen({ kind: 'credits' });
              }}
            />
            <AccountLink
              view={selectAccountLinkView(session.data)}
              onSignIn={() => {
                setIsSignInOpen(true);
              }}
              onSignOut={() => {
                signOut.mutate();
              }}
            />
          </div>
          {isSignInOpen ? (
            <SignInScreen
              onClose={() => {
                setIsSignInOpen(false);
              }}
            />
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
