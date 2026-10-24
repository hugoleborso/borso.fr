/** @Feature notifications */

import type { ParseKeys } from 'i18next';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { readInstallContext } from '../../lib/display-mode.adapter';
import {
  isPushSupported,
  NotificationPermissionRefusedError,
  readNotificationPermission,
} from '../../lib/push-subscription.adapter';
import {
  type NotificationCategory,
  useEnablePush,
  useNotificationPreferences,
  usePushSubscription,
  useUpdateNotificationPreference,
} from '../../lib/queries/notifications.queries';
import { Button } from '../atoms/Button';
import { HintText } from '../atoms/HintText';
import { Icon } from '../atoms/Icon';
import {
  type EnableFailure,
  isEnableOffered,
  type NotificationOffer,
  selectEnableFailure,
  selectNotificationOffer,
} from './notifications-offer.core';

const OFFER_MESSAGE_KEY: Readonly<Record<NotificationOffer, ParseKeys>> = {
  install: 'notifications.installHint',
  unsupported: 'notifications.unsupported',
  denied: 'notifications.denied',
  offer: 'notifications.offer',
  enabled: 'notifications.enabled',
};

const ENABLE_FAILURE_KEY: Readonly<Record<EnableFailure, ParseKeys>> = {
  'not-configured': 'notifications.notConfigured',
  refused: 'notifications.denied',
  failed: 'notifications.enableFailed',
};

const CATEGORY_LABEL_KEY: Readonly<Record<NotificationCategory, ParseKeys>> = {
  takes: 'notifications.categories.takes',
  take_comments: 'notifications.categories.takeComments',
  sessions: 'notifications.categories.sessions',
  setlists: 'notifications.categories.setlists',
};

function readEnableFailure(failure: Error): EnableFailure {
  return selectEnableFailure({
    status: failure instanceof ApiError ? failure.status : null,
    isPermissionRefusal: failure instanceof NotificationPermissionRefusedError,
  });
}

function EnableOnThisDevice(): JSX.Element {
  const { t } = useTranslation();
  const enablePush = useEnablePush();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        variant="accent"
        disabled={enablePush.isPending}
        onClick={() => enablePush.mutate()}
        className="w-full sm:w-auto"
      >
        <Icon name="bolt" size={16} />
        {t('notifications.enable')}
      </Button>
      {enablePush.error === null ? null : (
        <HintText tone="danger" role="alert">
          {t(ENABLE_FAILURE_KEY[readEnableFailure(enablePush.error)])}
        </HintText>
      )}
    </div>
  );
}

function CategoryToggles(): JSX.Element {
  const { t } = useTranslation();
  const preferences = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();
  return (
    <fieldset className="m-0 mt-4 p-0 border-0 flex flex-col gap-1">
      <legend className="text-xs tracking-wider uppercase text-ink-400 mb-2">
        {t('notifications.categoriesTitle')}
      </legend>
      {(preferences.data?.preferences ?? []).map((toggle) => (
        <label
          key={toggle.category}
          className="flex items-center justify-between gap-3 min-h-11 text-sm text-ink-900"
        >
          {t(CATEGORY_LABEL_KEY[toggle.category])}
          <input
            type="checkbox"
            className="size-5 accent-accent"
            checked={toggle.enabled}
            onChange={(event) =>
              updatePreference.mutate({ category: toggle.category, enabled: event.target.checked })
            }
          />
        </label>
      ))}
      {updatePreference.isError ? (
        <HintText tone="danger" role="alert">
          {t('notifications.saveFailed')}
        </HintText>
      ) : null}
    </fieldset>
  );
}

// @FollowsBlueprint organism-query-owning
export function NotificationSettings(): JSX.Element {
  const { t } = useTranslation();
  const isSupported = isPushSupported();
  const subscription = usePushSubscription(isSupported);
  const installContext = readInstallContext();
  const offer = selectNotificationOffer({
    isPushSupported: isSupported,
    permission: readNotificationPermission(),
    isSubscribed: subscription.data !== null && subscription.data !== undefined,
    isIos: installContext.isIos,
    isStandalone: installContext.isStandalone,
  });
  const isEnableShown = isEnableOffered(offer);
  return (
    <>
      <h2 className="text-base text-ink-900 m-0 mb-3">{t('notifications.title')}</h2>
      <p className="text-sm text-ink-500 mt-0 mb-3">{t(OFFER_MESSAGE_KEY[offer])}</p>
      {isEnableShown ? <EnableOnThisDevice /> : null}
      <CategoryToggles />
    </>
  );
}
