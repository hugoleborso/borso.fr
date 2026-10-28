/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateTo } from '../../lib/navigation.hook';
import { SectionTabs } from './SectionTabs';

export type SessionsSection = 'sessions' | 'setlists';

export interface SessionsSectionTabsProps {
  readonly value: SessionsSection;
}

const SECTION_PATH = {
  sessions: '/sessions',
  setlists: '/setlists',
} as const satisfies Readonly<Record<SessionsSection, string>>;

// @FollowsBlueprint molecule-presentational
export function SessionsSectionTabs({ value }: SessionsSectionTabsProps): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  return (
    <SectionTabs
      label={t('sessions.section.label')}
      tabs={[
        { value: 'sessions', label: t('sessions.section.sessions'), icon: 'sessions' },
        { value: 'setlists', label: t('sessions.section.setlists'), icon: 'setlist' },
      ]}
      value={value}
      onChange={(section) => navigateTo(SECTION_PATH[section], { replace: true })}
      className="mb-4"
    />
  );
}
