import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { PageTitle } from '../atoms/PageTitle';
import { Spinner } from '../atoms/Spinner';
import { QueryState } from '../molecules/QueryState';
import { SearchResultRow } from '../molecules/SearchResultRow';
import { useDebouncedValue } from '../../lib/debounced-value.hook';
import { useBrainSearch } from '../../lib/queries/brain.queries';
import { buildPageHref } from '../../lib/wikilinks.core';
import { isSearchableQuery, normaliseSearchQuery, SEARCH_DEBOUNCE_MS } from './brain-search.core';

// @FollowsBlueprint organism-query-owning
export function BrainSearch(): JSX.Element {
  const { t } = useTranslation();
  const search = useDebouncedValue('', SEARCH_DEBOUNCE_MS);
  const query = normaliseSearchQuery(search.settledValue);
  const isSearchable = isSearchableQuery(query);
  const searchHits = useBrainSearch(query, isSearchable);

  return (
    <>
      <PageTitle>{t('brain.title')}</PageTitle>
      <div className="flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">{t('brain.search.label')}</span>
          <Icon
            name="search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
          />
          <Input
            type="search"
            value={search.value}
            onChange={(event) => search.onValueChanged(event.target.value)}
            placeholder={t('brain.search.placeholder')}
            className="pl-10"
            enterKeyHint="search"
            autoCorrect="off"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/brain/graph"
            className="flex items-center gap-2 min-h-12 px-3 rounded-lg border border-line bg-surface text-sm font-medium text-ink no-underline"
          >
            <Icon name="brain" size={18} className="text-bronze" />
            {t('brain.graph-link')}
          </Link>
          <Link
            to={buildPageHref('index')}
            className="flex items-center gap-2 min-h-12 px-3 rounded-lg border border-line bg-surface text-sm font-medium text-ink no-underline"
          >
            <Icon name="link" size={18} className="text-bronze" />
            {t('brain.home-link')}
          </Link>
        </div>
        {isSearchable ? null : (
          <p className="m-0 text-sm text-ink-faint">{t('brain.search.hint')}</p>
        )}
        {isSearchable && searchHits.isError ? (
          <QueryState isPending={false} onRetry={() => void searchHits.refetch()} />
        ) : null}
        {isSearchable && searchHits.isPending ? <Spinner label={t('common.loading')} /> : null}
        {isSearchable && searchHits.data !== undefined ? (
          <Card padding="none" className="px-4">
            <ul className="m-0 p-0 list-none">
              {searchHits.data.map((result) => (
                <SearchResultRow
                  key={result.path}
                  href={buildPageHref(result.path)}
                  title={result.title}
                  path={result.path}
                  excerpt={result.excerpt}
                />
              ))}
              {searchHits.data.length === 0 ? (
                <li className="py-4 text-sm text-ink-faint">{t('brain.search.empty')}</li>
              ) : null}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
