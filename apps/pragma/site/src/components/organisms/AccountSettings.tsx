/** @Feature auth */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  ACCOUNT_SECTION_PARAM,
  ACCOUNT_SECTIONS,
  type AccountSection,
  readAccountSection,
} from '../../routes/account/account-page.core';
import { Card } from '../atoms/Card';
import type { IconName } from '../atoms/Icon';
import { LanguageSwitcher } from '../molecules/LanguageSwitcher';
import { PageHeader } from '../molecules/PageHeader';
import { SectionTabs } from '../molecules/SectionTabs';
import { AssistantConnections } from './AssistantConnections';
import { CalendarFeedCard } from './CalendarFeedCard';
import { ContactDetailsCard } from './ContactDetailsCard';
import { NotificationSettings } from './NotificationSettings';
import { PasskeysCard } from './PasskeysCard';
import { PasswordChangeCard } from './PasswordChangeCard';
import { SignedInMemberCard } from './SignedInMemberCard';

const SECTION_LABEL_KEY = {
  profile: 'account.sections.profile',
  'sign-in': 'account.sections.signIn',
  calendar: 'account.sections.calendar',
  notifications: 'account.sections.notifications',
  language: 'account.sections.language',
} as const satisfies Readonly<Record<AccountSection, string>>;
const SECTION_ICON = {
  profile: 'user',
  'sign-in': 'fingerprint',
  calendar: 'calendar',
  notifications: 'bolt',
  language: 'text',
} as const satisfies Readonly<Record<AccountSection, IconName>>;

function LanguageSection(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-body text-ink m-0 mb-3">{t('account.language')}</h2>
      <LanguageSwitcher />
    </Card>
  );
}

function ProfileSection(): JSX.Element {
  return (
    <>
      <SignedInMemberCard />
      <ContactDetailsCard />
      <PasswordChangeCard />
    </>
  );
}

function SignInSection(): JSX.Element {
  return (
    <>
      <PasskeysCard />
      <AssistantConnections />
    </>
  );
}

const SECTION_CONTENT: Readonly<Record<AccountSection, () => JSX.Element>> = {
  profile: ProfileSection,
  'sign-in': SignInSection,
  calendar: CalendarFeedCard,
  notifications: NotificationSettings,
  language: LanguageSection,
};

// @FollowsBlueprint organism-presentational
export function AccountSettings(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = readAccountSection(searchParams.get(ACCOUNT_SECTION_PARAM));
  const Content = SECTION_CONTENT[section];
  return (
    <section className="flex max-w-[640px] flex-col gap-4 px-4 py-4 sm:px-9 sm:py-7">
      <PageHeader
        back={{ to: '/band', label: t('band.title') }}
        title={t('account.title')}
        className="mb-0 sm:mb-0"
      >
        <SectionTabs
          label={t('account.sections.label')}
          tabs={ACCOUNT_SECTIONS.map((option) => ({
            value: option,
            label: t(SECTION_LABEL_KEY[option]),
            icon: SECTION_ICON[option],
          }))}
          value={section}
          layout="stacked"
          onChange={(next) => setSearchParams({ [ACCOUNT_SECTION_PARAM]: next }, { replace: true })}
        />
      </PageHeader>
      <Content />
    </section>
  );
}
