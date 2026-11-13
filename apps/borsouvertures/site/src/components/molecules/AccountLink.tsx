import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import type { AccountLinkView } from '@/lib/account-session.core';

type ShownAccountLinkView = Exclude<AccountLinkView, 'hidden'>;

const LABEL_KEY_BY_VIEW = {
  'signed-out': 'account.sign-in',
  'signed-in': 'account.sign-out',
} as const satisfies Record<ShownAccountLinkView, string>;

interface AccountLinkProps {
  view: AccountLinkView;
  onSignIn: () => void;
  onSignOut: () => void;
}

// @FollowsBlueprint molecule-presentational
export function AccountLink({ view, onSignIn, onSignOut }: AccountLinkProps) {
  const { t } = useTranslation();
  if (view === 'hidden') return null;
  const actionByView: Record<ShownAccountLinkView, () => void> = {
    'signed-out': onSignIn,
    'signed-in': onSignOut,
  };
  return <Button label={t(LABEL_KEY_BY_VIEW[view])} onActivate={actionByView[view]} />;
}
