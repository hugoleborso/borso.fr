/** @Feature auth */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { LanguageSwitcher } from '../molecules/LanguageSwitcher';
import { CalendarFeedCard } from './CalendarFeedCard';
import { ContactDetailsCard } from './ContactDetailsCard';
import { NotificationSettings } from './NotificationSettings';
import { PasskeysCard } from './PasskeysCard';
import { PasswordChangeCard } from './PasswordChangeCard';
import { SignedInMemberCard } from './SignedInMemberCard';

// @FollowsBlueprint organism-presentational
export function AccountSettings(): JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4 p-4 sm:p-6 max-w-[640px]">
      <h1 className="font-display text-display leading-none text-ink m-0">{t('account.title')}</h1>
      <SignedInMemberCard />
      <Card className="p-4 sm:p-6">
        <h2 className="text-body text-ink m-0 mb-3">{t('account.language')}</h2>
        <LanguageSwitcher />
      </Card>
      <ContactDetailsCard />
      <CalendarFeedCard />
      <NotificationSettings />
      <PasswordChangeCard />
      <PasskeysCard />
    </section>
  );
}
