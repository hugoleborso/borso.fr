import { useTranslation } from 'react-i18next';
import { Notice } from '@/components/atoms/Notice';

interface SessionExpiredBannerProps {
  onSignIn: () => void;
}

// @FollowsBlueprint molecule-presentational
export function SessionExpiredBanner({ onSignIn }: SessionExpiredBannerProps) {
  const { t } = useTranslation();
  return (
    <Notice
      message={t('account.session-expired')}
      action={{ label: t('account.sign-in'), onActivate: onSignIn }}
    />
  );
}
