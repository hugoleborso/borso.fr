import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { MarkdownContent } from '../atoms/MarkdownContent';
import { EmptyState } from '../molecules/EmptyState';
import { QueryState } from '../molecules/QueryState';
import { useInAppLinkClick } from '../../lib/in-app-link.hook';
import { renderMarkdownToSafeHtml } from '../../lib/markdown.utils';
import { usePage } from '../../lib/queries/brain.queries';
import { normalisePagePath } from '../../lib/wikilinks.core';
import { readSourceList } from './source-reference.core';
import { SourceView } from './SourceView';

const NOT_FOUND_STATUS = 404;
const SECTION_LABEL_CLASS_NAME = 'm-0 px-1 pb-1 text-label text-ink-muted';

export interface CommitmentWithSourcesProps {
  readonly path: string;
}

// @FollowsBlueprint organism-query-owning
export function CommitmentWithSources({ path }: CommitmentWithSourcesProps): JSX.Element {
  const { t } = useTranslation();
  const page = usePage(normalisePagePath(path));
  const onLinkClick = useInAppLinkClick();
  const isNotFound =
    page.error !== null && 'status' in page.error && page.error.status === NOT_FOUND_STATUS;
  if (isNotFound) return <EmptyState icon="commitment" label={t('brain.page.not-found')} />;
  if (page.data === undefined) {
    return <QueryState isPending={page.isPending} onRetry={() => void page.refetch()} />;
  }
  const sources = readSourceList(page.data.frontMatter.sources);
  return (
    <>
      <section aria-label={t('detail.commitment')}>
        <h2 className={SECTION_LABEL_CLASS_NAME}>{t('detail.commitment')}</h2>
        <Card padding="lg">
          <MarkdownContent
            html={renderMarkdownToSafeHtml(page.data.markdown)}
            onClick={onLinkClick}
          />
        </Card>
      </section>
      {sources.length === 0 ? null : (
        <section aria-label={t('detail.sources')}>
          <h2 className={SECTION_LABEL_CLASS_NAME}>{t('detail.sources')}</h2>
          <Card padding="none" className="divide-y divide-line">
            {sources.map((source) => (
              <SourceView key={source} source={source} isInitiallyOpen={false} />
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
