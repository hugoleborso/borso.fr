import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonVariants } from '../atoms/button.variants';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { NotificationSettings } from './NotificationSettings';
import { PasskeySettings } from './PasskeySettings';
import { SessionSettings } from './SessionSettings';

// @FollowsBlueprint organism-shell
export function SettingsOverview(): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <Link
        to="/"
        className={buttonVariants({ variant: 'quiet', size: 'sm', className: '-ml-2 mt-2' })}
      >
        <Icon name="back" size={18} />
        {t('settings.back')}
      </Link>
      <PageTitle>{t('settings.title')}</PageTitle>
      <div className="flex flex-col gap-6">
        <PasskeySettings />
        <NotificationSettings />
        <SessionSettings />
      </div>
    </>
  );
}
