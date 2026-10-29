/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionView } from '../../routes/sessions/session-page.core';
import type { IconName } from '../atoms/Icon';
import { SectionTabs } from './SectionTabs';

export interface SessionViewTabsProps {
  readonly views: readonly SessionView[];
  readonly value: SessionView;
  readonly onChange: (view: SessionView) => void;
}

const SESSION_VIEW_LABEL_KEY = {
  setlist: 'sessions.view.setlist',
  tasks: 'sessions.view.tasks',
  takes: 'sessions.view.takes',
  details: 'sessions.view.details',
} as const satisfies Readonly<Record<SessionView, string>>;
const SESSION_VIEW_ICON = {
  setlist: 'setlist',
  tasks: 'tasks',
  takes: 'mic',
  details: 'edit',
} as const satisfies Readonly<Record<SessionView, IconName>>;

// @FollowsBlueprint molecule-presentational
export function SessionViewTabs({ views, value, onChange }: SessionViewTabsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <SectionTabs
      label={t('sessions.view.label')}
      tabs={views.map((view) => ({
        value: view,
        label: t(SESSION_VIEW_LABEL_KEY[view]),
        icon: SESSION_VIEW_ICON[view],
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
