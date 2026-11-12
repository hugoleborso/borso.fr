import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { FoldedSection } from '../molecules/FoldedSection';
import { LatePageRow } from '../molecules/LatePageRow';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { selectClosenessNameKey } from '../../lib/closeness-name.core';
import { useFreshness } from '../../lib/queries/freshness.queries';
import { buildPageHref } from '../../lib/wikilinks.core';
import { orderLatePages } from './late-pages.core';

// @FollowsBlueprint organism-query-owning
export function LatePages(): JSX.Element | null {
  const { t } = useTranslation();
  const freshness = useFreshness();
  if (freshness.data === undefined || freshness.data.lateCount === 0) return null;
  return (
    <FoldedSection label={t('brain.late', { count: freshness.data.lateCount })}>
      {orderLatePages(freshness.data.pages).map((page) => {
        const levelNameKey = selectClosenessNameKey(page.closeness, page.kind);
        return (
          <LatePageRow
            key={page.slug}
            href={buildPageHref(page.slug)}
            title={page.title}
            kind={page.kind}
            levelName={levelNameKey === null ? null : t(levelNameKey)}
            summarized={t('brain.page.summarized', {
              day: formatShortDay(page.summarizedOn, DISPLAY_LOCALE),
            })}
            onLongPress={() => {
              openActionSheet({ title: page.title, subject: { kind: 'page', path: page.slug } });
            }}
          />
        );
      })}
    </FoldedSection>
  );
}
