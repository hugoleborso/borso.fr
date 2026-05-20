/**
 * Top-of-page strip that announces offline state. Listens for the
 * browser's `online` / `offline` events (genuinely external to React's
 * tree — the right shape for `useEffect`). The spec ties offline use
 * to the PWA service worker; this banner is the user-facing "you are
 * in read-only mode" signal.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function readInitialOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function OfflineBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const [online, setOnline] = useState<boolean>(readInitialOnline);

  useEffect(() => {
    const handleOnline = (): void => setOnline(true);
    const handleOffline = (): void => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      {t('common.offline')}
    </div>
  );
}
