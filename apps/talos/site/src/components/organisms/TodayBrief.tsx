import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { selectBriefPreview } from './today-brief.core';

export interface TodayBriefProps {
  readonly brief: { readonly date: string; readonly markdown: string };
}

const PREVIEW_LINE_COUNT = 3;

// @FollowsBlueprint organism-presentational
export function TodayBrief({ brief }: TodayBriefProps): JSX.Element {
  const { t } = useTranslation();
  const onLinkClick = useInAppLinkClick();
  const [isWhole, setIsWhole] = useState(false);
  const preview = selectBriefPreview(brief.markdown, PREVIEW_LINE_COUNT);
  const shownMarkdown = isWhole ? brief.markdown : preview.markdown;
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
      <section aria-label={t('today.brief.title')}>
        <div
          {...press.handlers}
          className={composeClassName(
            'flex items-center justify-between gap-3 mb-1',
            PRESSABLE_CLASS_NAME,
          )}
        >
          <h2 className="m-0 flex items-center gap-2 text-heading text-patina">
            <Icon name="today" size={20} />
            {t('today.brief.title')}
          </h2>
          <span className="text-caption text-ink-muted">
            {formatShortDay(brief.date, DISPLAY_LOCALE)}
          </span>
        </div>
        <MarkdownContent html={renderMarkdownToSafeHtml(shownMarkdown)} onClick={onLinkClick} />
        {preview.isShortened ? (
          <Button
            variant="quiet"
            aria-expanded={isWhole}
            onClick={() => setIsWhole((wasWhole) => !wasWhole)}
            className="mt-1 -ml-2"
          >
            {t(isWhole ? 'today.brief.less' : 'today.brief.more')}
            <Icon
              name="chevron"
              size={16}
              className={composeClassName(
                'transition-transform',
                isWhole ? '-rotate-90' : 'rotate-90',
              )}
            />
          </Button>
        ) : null}
      </section>
    </Card>
  );
}
