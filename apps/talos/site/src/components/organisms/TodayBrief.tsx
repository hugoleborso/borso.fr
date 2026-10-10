import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';

export interface TodayBriefProps {
  readonly brief: { readonly date: string; readonly markdown: string };
}

// @FollowsBlueprint organism-presentational
export function TodayBrief({ brief }: TodayBriefProps): JSX.Element {
  const { t } = useTranslation();
  const onLinkClick = useInAppLinkClick();
  const press = usePressGesture({
    onLongPress: () => {
      openActionSheet({
        title: t('today.brief.sheet-title', { date: formatShortDay(brief.date, DISPLAY_LOCALE) }),
        subject: { kind: 'journal', date: brief.date },
      });
    },
  });
  return (
    <Card>
      <details open className="group">
        <summary
          {...press.handlers}
          className={composeClassName(
            'flex items-center justify-between gap-3 min-h-11 -my-1 cursor-pointer list-none',
            PRESSABLE_CLASS_NAME,
          )}
        >
          <h2 className="m-0 flex items-center gap-2 text-heading text-patina">
            <Icon name="today" size={20} />
            {t('today.brief.title')}
          </h2>
          <span className="flex items-center gap-1 text-caption text-ink-muted">
            {formatShortDay(brief.date, DISPLAY_LOCALE)}
            <Icon name="chevron" size={16} className="transition-transform group-open:rotate-90" />
          </span>
        </summary>
        <div className="mt-2">
          <MarkdownContent html={renderMarkdownToSafeHtml(brief.markdown)} onClick={onLinkClick} />
        </div>
      </details>
    </Card>
  );
}
