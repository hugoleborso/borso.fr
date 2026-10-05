import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Notice } from '../atoms/Notice';
import { SectionTitle } from '../atoms/SectionTitle';
import { isPushSupported, readNotificationPermission } from '../../lib/push-subscription.adapter';
import {
  useDisablePush,
  useEnablePush,
  usePushSubscription,
  useSendTestPush,
} from '../../lib/queries/push.queries';
import { selectNotificationOffer } from './notifications-offer.core';

function UnsupportedState(): JSX.Element {
  const { t } = useTranslation();
  return <Notice>{t('settings.notifications.unsupported')}</Notice>;
}

function DeniedState(): JSX.Element {
  const { t } = useTranslation();
  return <Notice>{t('settings.notifications.denied')}</Notice>;
}

function DisabledState(): JSX.Element {
  const { t } = useTranslation();
  const enablePush = useEnablePush();
  return (
    <>
      <p className="m-0 mb-3 text-body-sm text-ink-soft">{t('settings.notifications.disabled')}</p>
      <Button
        variant="primary"
        className="w-full"
        disabled={enablePush.isPending}
        onClick={() => enablePush.mutate()}
      >
        <Icon name="bell" size={18} />
        {t('settings.notifications.enable')}
      </Button>
    </>
  );
}

function EnabledState(): JSX.Element {
  const { t } = useTranslation();
  const sendTestPush = useSendTestPush();
  const disablePush = useDisablePush();
  return (
    <>
      <p className="m-0 mb-3 text-body-sm text-ink-soft">{t('settings.notifications.enabled')}</p>
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          disabled={sendTestPush.isPending}
          onClick={() => sendTestPush.mutate()}
        >
          <Icon name="send" size={18} />
          {t('settings.notifications.test')}
        </Button>
        <Button
          variant="danger"
          disabled={disablePush.isPending}
          onClick={() => disablePush.mutate()}
        >
          <Icon name="bell-off" size={18} />
          {t('settings.notifications.disable')}
        </Button>
      </div>
    </>
  );
}

const NOTIFICATION_STATE_VIEW = {
  unsupported: UnsupportedState,
  denied: DeniedState,
  offer: DisabledState,
  enabled: EnabledState,
} as const;

// @FollowsBlueprint organism-query-owning
export function NotificationSettings(): JSX.Element {
  const { t } = useTranslation();
  const isSupported = isPushSupported();
  const subscription = usePushSubscription(isSupported);
  const StateView =
    NOTIFICATION_STATE_VIEW[
      selectNotificationOffer(
        isSupported,
        readNotificationPermission(),
        subscription.data !== null && subscription.data !== undefined,
      )
    ];
  return (
    <Card>
      <SectionTitle>{t('settings.notifications.title')}</SectionTitle>
      <StateView />
    </Card>
  );
}
