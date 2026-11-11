import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { composeClassName } from '../atoms/class-name.utils';
import { FrontMatterChips } from '../molecules/FrontMatterChips';
import { type PageLink, PageLinkList } from '../molecules/PageLinkList';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { PRESSABLE_CLASS_NAME, usePressGesture } from '../../lib/press-gesture.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { usePage } from '../../lib/queries/brain.queries';
import { useFreshness } from '../../lib/queries/freshness.queries';
import { buildPageHref, selectPageLabel, selectPageName } from '../../lib/wikilinks.core';
import { selectFrontMatterEntries } from './front-matter-chips.core';
import { splitTitleLine } from './brain-page-title.core';
import { isPageLate } from './late-pages.core';

const NOT_FOUND_STATUS = 404;

function toPageLinks(paths: readonly string[]): PageLink[] {
  return paths.map((path) => ({ href: buildPageHref(path), path, label: selectPageName(path) }));
}

interface SummaryLineProps {
  readonly summarizedOn: string;
  readonly isLate: boolean;
}

function SummaryLine({ summarizedOn, isLate }: SummaryLineProps): JSX.Element {
  const { t } = useTranslation();
  const day = formatShortDay(summarizedOn, DISPLAY_LOCALE);
  return (
    <p
      className={composeClassName(
        'm-0 mb-3 text-caption',
        isLate ? 'font-semibold text-danger' : 'text-ink-muted',
      )}
    >
      {t(isLate ? 'brain.page.summarized-late' : 'brain.page.summarized', { day })}
    </p>
  );
}

function discussLinkedPage(link: PageLink): void {
  openActionSheet({ title: link.label, subject: { kind: 'page', path: link.path } });
}

export interface BrainPageViewProps {
  readonly path: string;
}

// @FollowsBlueprint organism-query-owning
export function BrainPageView({ path }: BrainPageViewProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const page = usePage(path);
  const freshness = useFreshness();
  const onLinkClick = useInAppLinkClick();
  const press = usePressGesture({
    onLongPress: () => {
      openActionSheet({
        title: page.data?.title ?? selectPageLabel(path),
        subject: { kind: 'page', path },
      });
    },
  });
  const { title, rest } = splitTitleLine(page.data?.markdown ?? '');
  const isNotFound =
    page.error !== null && 'status' in page.error && page.error.status === NOT_FOUND_STATUS;

  return (
    <article className="pt-2">
      <div
        {...press.handlers}
        className={composeClassName('flex items-center gap-1 -ml-3 mb-2', PRESSABLE_CLASS_NAME)}
      >
        <Button
          variant="quiet"
          size="icon"
          aria-label={t('brain.page.back')}
          onClick={() => void navigate(-1)}
        >
          <Icon name="back" size={22} />
        </Button>
        <p className="m-0 min-w-0 flex-1 text-xs font-mono text-ink-faint truncate">{path}</p>
      </div>
      {isNotFound ? <EmptyState icon="search" label={t('brain.page.not-found')} /> : null}
      {page.data === undefined && !isNotFound ? (
        <QueryState isPending={page.isPending} onRetry={() => void page.refetch()} />
      ) : null}
      {page.data === undefined ? null : (
        <>
          <FrontMatterChips entries={selectFrontMatterEntries(page.data.frontMatter)} />
          <Card padding="lg">
            <MarkdownContent html={renderMarkdownToSafeHtml(title)} onClick={onLinkClick} />
            {page.data.summarizedOn === null ? null : (
              <SummaryLine
                summarizedOn={page.data.summarizedOn}
                isLate={isPageLate(freshness.data?.pages, path)}
              />
            )}
            <MarkdownContent html={renderMarkdownToSafeHtml(rest)} onClick={onLinkClick} />
          </Card>
          <PageLinkList
            label={t('brain.page.incoming')}
            icon="incoming"
            links={toPageLinks(page.data.incomingLinks)}
            onLongPress={discussLinkedPage}
          />
          <PageLinkList
            label={t('brain.page.outgoing')}
            icon="outgoing"
            links={toPageLinks(page.data.outgoingLinks)}
            onLongPress={discussLinkedPage}
          />
        </>
      )}
    </article>
  );
}
