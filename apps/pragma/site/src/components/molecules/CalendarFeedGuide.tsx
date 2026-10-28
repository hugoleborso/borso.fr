/** @Feature auth */

import type { ParseKeys } from 'i18next';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CALENDAR_PLATFORMS,
  type CalendarGuideStep,
  type CalendarPlatform,
  calendarGuideOf,
} from '../../lib/calendar-guide.utils';
import { ButtonAnchor } from '../atoms/ButtonAnchor';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';

export interface CalendarFeedGuideProps {
  readonly platform: CalendarPlatform;
  readonly onSelectPlatform: (platform: CalendarPlatform) => void;
}

const PLATFORM_LABEL_KEY = {
  iphone: 'account.calendarGuide.platform.iphone',
  android: 'account.calendarGuide.platform.android',
  computer: 'account.calendarGuide.platform.computer',
} as const satisfies Readonly<Record<CalendarPlatform, ParseKeys>>;

const STEP_KEY = {
  'iphone-open-calendars': 'account.calendarGuide.steps.iphoneOpenCalendars',
  'iphone-tap-info': 'account.calendarGuide.steps.iphoneTapInfo',
  'iphone-share-link': 'account.calendarGuide.steps.iphoneShareLink',
  'google-open-settings': 'account.calendarGuide.steps.googleOpenSettings',
  'google-integrate': 'account.calendarGuide.steps.googleIntegrate',
  'google-copy-secret': 'account.calendarGuide.steps.googleCopySecret',
  'outlook-publish': 'account.calendarGuide.steps.outlookPublish',
  'paste-here': 'account.calendarGuide.steps.pasteHere',
} as const satisfies Readonly<Record<CalendarGuideStep, ParseKeys>>;

// @FollowsBlueprint molecule-presentational
export function CalendarFeedGuide({
  platform,
  onSelectPlatform,
}: CalendarFeedGuideProps): JSX.Element {
  const { t } = useTranslation();
  const guide = calendarGuideOf(platform);
  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label={t('account.calendarGuide.platformLabel')}
        className="flex flex-wrap gap-2"
      >
        {CALENDAR_PLATFORMS.map((option) => (
          <Chip key={option} pressed={option === platform} onPress={() => onSelectPlatform(option)}>
            {t(PLATFORM_LABEL_KEY[option])}
          </Chip>
        ))}
      </div>
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-meta text-ink">
        {guide.steps.map((step) => (
          <li key={step}>{t(STEP_KEY[step])}</li>
        ))}
      </ol>
      {guide.settingsAddress === null ? null : (
        <div>
          <ButtonAnchor
            href={guide.settingsAddress}
            variant="secondary"
            mark={<Icon name="external" size="md" />}
          >
            {t('account.calendarGuide.openSettings')}
          </ButtonAnchor>
        </div>
      )}
    </div>
  );
}
