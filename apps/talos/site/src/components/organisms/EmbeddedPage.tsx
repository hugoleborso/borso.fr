import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { usePage } from '../../lib/queries/brain.queries';

const NOT_FOUND_STATUS = 404;

export interface EmbeddedPageProps {
  readonly path: string;
}

// @FollowsBlueprint organism-query-owning
export function EmbeddedPage({ path }: EmbeddedPageProps): JSX.Element {
  const { t } = useTranslation();
  const page = usePage(path);
  const onLinkClick = useInAppLinkClick();
  const isNotFound =
    page.error !== null && 'status' in page.error && page.error.status === NOT_FOUND_STATUS;
  if (isNotFound) return <EmptyState icon="search" label={t('brain.page.not-found')} />;
  if (page.data === undefined) {
    return <QueryState isPending={page.isPending} onRetry={() => void page.refetch()} />;
  }
  return (
    <MarkdownContent html={renderMarkdownToSafeHtml(page.data.markdown)} onClick={onLinkClick} />
  );
}
