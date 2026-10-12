import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { InstallHint } from '../molecules/InstallHint';
import { isPushSupported, readNotificationPermission } from '../../lib/push-subscription.adapter';
import { useEnablePush, usePushSubscription } from '../../lib/queries/push.queries';
import { useIsDisplayedStandalone } from '../../lib/standalone-display.hook';
import {
  isIosDevice,
  selectNotificationOffer,
  shouldShowInstallHint,
} from './notifications-offer.core';

function NothingToOffer(): null {
  return null;
}

function EnableOffer(): JSX.Element | null {
  const { t } = useTranslation();
  const enablePush = useEnablePush();
  const [isPostponed, setIsPostponed] = useState(false);
  if (isPostponed) return null;
  return (
    <div className="flex items-center gap-2 min-h-13 pl-4 pr-1 rounded-lg bg-patina-soft text-patina">
      <Icon name="bell" size={20} />
      <span className="flex-1 text-body-sm font-semibold">{t('today.notifications.title')}</span>
      <Button
        variant="primary"
        size="sm"
        disabled={enablePush.isPending}
        onClick={() => {
          enablePush.mutate();
        }}
      >
        {t('today.notifications.offer')}
      </Button>
      <Button
        variant="quiet"
        size="icon"
        aria-label={t('today.notifications.later')}
        onClick={() => setIsPostponed(true)}
      >
        <Icon name="close" size={18} />
      </Button>
    </div>
  );
}

const OFFER_VIEW = {
  unsupported: NothingToOffer,
  enabled: NothingToOffer,
  denied: NothingToOffer,
  offer: EnableOffer,
} as const;

// @FollowsBlueprint organism-query-owning
export function NotificationsPrompt(): JSX.Element {
  const isStandalone = useIsDisplayedStandalone();
  const isSupported = isPushSupported();
  const subscription = usePushSubscription(isSupported);
  const isInstallHintShown = shouldShowInstallHint(
    isIosDevice(navigator.userAgent, navigator.maxTouchPoints),
    isStandalone,
  );
  const OfferView =
    OFFER_VIEW[
      selectNotificationOffer(
        isSupported,
        readNotificationPermission(),
        subscription.data !== null && subscription.data !== undefined,
      )
    ];
  return isInstallHintShown ? <InstallHint /> : <OfferView />;
}
