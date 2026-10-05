import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Notice } from '../atoms/Notice';
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

function DeniedNotice(): JSX.Element {
  const { t } = useTranslation();
  return <Notice>{t('today.notifications.denied')}</Notice>;
}

function EnableOffer(): JSX.Element | null {
  const { t } = useTranslation();
  const enablePush = useEnablePush();
  const [isPostponed, setIsPostponed] = useState(false);
  if (isPostponed) return null;
  return (
    <Card>
      <div className="flex gap-3 items-start">
        <Icon name="bell" size={22} className="text-patina mt-0.5" />
        <div className="flex-1">
          <p className="m-0 text-heading text-ink">{t('today.notifications.title')}</p>
          <p className="m-0 mt-0.5 text-body-sm text-ink-soft">{t('today.notifications.lead')}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="quiet" onClick={() => setIsPostponed(true)}>
          {t('today.notifications.later')}
        </Button>
        <Button
          variant="primary"
          disabled={enablePush.isPending}
          onClick={() => {
            enablePush.mutate();
          }}
        >
          {t('today.notifications.offer')}
        </Button>
      </div>
    </Card>
  );
}

const OFFER_VIEW = {
  unsupported: NothingToOffer,
  enabled: NothingToOffer,
  denied: DeniedNotice,
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
