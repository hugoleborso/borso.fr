import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { AccountLink } from '@/components/molecules/AccountLink';
import { BoardStyleSelect } from '@/components/molecules/BoardStyleSelect';
import { LanguageSwitcher } from '@/components/molecules/LanguageSwitcher';
import { SignInScreen } from '@/components/organisms/SignInScreen';
import { selectAccountLinkView } from '@/lib/account-session.core';
import { useAccountSession, useSignOut } from '@/lib/queries/account.queries';
import { openScreen } from '@/navigation/navigation.store';
import { useAppState } from '@/state/appState';

// @FollowsBlueprint organism-presentational
export function TopBar() {
  const { t } = useTranslation();
  const { boardStyle } = useAppState();
  const session = useAccountSession();
  const signOut = useSignOut();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <h1 className="text-[1rem] font-bold roomy:text-[1.2rem]">{t('top-bar.brand')}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <BoardStyleSelect boardStyle={boardStyle} />
        <LanguageSwitcher />
        <Button label={t('credits.link')} onActivate={() => openScreen({ kind: 'credits' })} />
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
        <div className="basis-full">
          <SignInScreen
            onClose={() => {
              setIsSignInOpen(false);
            }}
          />
        </div>
      ) : null}
    </header>
  );
}
