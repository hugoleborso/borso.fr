import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { EmptyState } from '../molecules/EmptyState';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';

export interface TodayBriefProps {
  readonly brief: { readonly date: string; readonly markdown: string } | null;
}

// @FollowsBlueprint organism-presentational
export function TodayBrief({ brief }: TodayBriefProps): JSX.Element {
  const { t } = useTranslation();
  const onLinkClick = useInAppLinkClick();
  return (
    <Card>
      <section>
        <div className="flex items-center justify-between gap-3 min-h-9 mb-2">
          <h2 className="m-0 flex items-center gap-2 text-heading text-patina">
            <Icon name="today" size={20} />
            {t('today.brief.title')}
          </h2>
          {brief === null ? null : (
            <span className="text-caption text-ink-muted">
              {formatShortDay(brief.date, DISPLAY_LOCALE)}
            </span>
          )}
        </div>
        {brief === null ? (
          <EmptyState
            icon="today"
            title={t('today.brief.empty')}
            body={t('today.brief.empty-body')}
          />
        ) : (
          <MarkdownContent html={renderMarkdownToSafeHtml(brief.markdown)} onClick={onLinkClick} />
        )}
      </section>
    </Card>
  );
}
