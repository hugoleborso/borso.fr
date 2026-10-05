import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { Notice } from '../atoms/Notice';
import { FrontMatterChips } from '../molecules/FrontMatterChips';
import { PageLinkList } from '../molecules/PageLinkList';
import { QueryState } from '../molecules/QueryState';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { usePage } from '../../lib/queries/brain.queries';
import { buildPageHref, selectPageLabel } from '../../lib/wikilinks.core';
import { selectFrontMatterEntries } from './front-matter-chips.core';

const NOT_FOUND_STATUS = 404;

function toPageLinks(paths: readonly string[]): { href: string; label: string }[] {
  return paths.map((path) => ({ href: buildPageHref(path), label: selectPageLabel(path) }));
}

export interface BrainPageViewProps {
  readonly path: string;
}

// @FollowsBlueprint organism-query-owning
export function BrainPageView({ path }: BrainPageViewProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const page = usePage(path);
  const onLinkClick = useInAppLinkClick();
  const isNotFound =
    page.error !== null && 'status' in page.error && page.error.status === NOT_FOUND_STATUS;

  return (
    <article className="pt-2">
      <Button variant="quiet" size="sm" className="-ml-2 mb-2" onClick={() => void navigate(-1)}>
        <Icon name="back" size={18} />
        {t('brain.page.back')}
      </Button>
      {isNotFound ? <Notice tone="danger">{t('brain.page.not-found')}</Notice> : null}
      {page.data === undefined && !isNotFound ? (
        <QueryState isPending={page.isPending} onRetry={() => void page.refetch()} />
      ) : null}
      {page.data === undefined ? null : (
        <>
          <p className="m-0 mb-2 text-xs font-mono text-ink-faint break-all">{page.data.path}</p>
          <FrontMatterChips entries={selectFrontMatterEntries(page.data.frontMatter)} />
          <Card padding="lg">
            <MarkdownContent
              html={renderMarkdownToSafeHtml(page.data.markdown)}
              onClick={onLinkClick}
            />
          </Card>
          <PageLinkList
            title={t('brain.page.incoming')}
            emptyLabel={t('brain.page.none')}
            links={toPageLinks(page.data.incomingLinks)}
          />
          <PageLinkList
            title={t('brain.page.outgoing')}
            emptyLabel={t('brain.page.none')}
            links={toPageLinks(page.data.outgoingLinks)}
          />
        </>
      )}
    </article>
  );
}
