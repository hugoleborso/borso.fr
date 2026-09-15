/** @Feature bars */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { debounce } from '../../lib/debounce.utils';
import { useBarPlaceSearch } from '../../lib/queries/bars.queries';
import { Card } from '../atoms/Card';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';

const DEBOUNCE_MS = 600;
const SEARCH_DISABLED_STATUS = 503;

export interface BarPlaceHit {
  readonly placeId: string;
  readonly name: string;
  readonly address: string | null;
  readonly city: string | null;
  readonly phone: string | null;
}

export interface BarPlaceSearchProps {
  readonly onPick: (hit: BarPlaceHit) => void;
}

// @FollowsBlueprint organism-query-owning
export function BarPlaceSearch({ onPick }: BarPlaceSearchProps): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const publishDebouncedQuery = useMemo(
    () => debounce((nextQuery: string) => setDebouncedQuery(nextQuery), DEBOUNCE_MS),
    [],
  );

  const changeQuery = (nextQuery: string): void => {
    setQuery(nextQuery);
    publishDebouncedQuery(nextQuery.trim());
  };

  const search = useBarPlaceSearch(debouncedQuery);
  const hits = search.data?.hits ?? [];
  const status = search.error instanceof ApiError ? search.error.status : null;
  const isDisabledUpstream = status === SEARCH_DISABLED_STATUS;
  const hasSearched = debouncedQuery.length > 0 && !search.isFetching && search.error === null;

  return (
    <Card className="mb-5">
      <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-3">
        {t('bars.searchTitle')}
      </h3>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
          <Icon name="search" />
        </span>
        <Input
          type="search"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder={t('bars.searchPlaceholder')}
          aria-label={t('bars.searchTitle')}
          className="pl-9"
        />
      </div>
      {isDisabledUpstream ? (
        <p className="text-sm text-ink-500 mt-3 mb-0">{t('bars.searchDisabled')}</p>
      ) : null}
      {search.isFetching ? (
        <p className="text-sm text-ink-400 italic mt-3 mb-0">{t('common.loading')}</p>
      ) : null}
      {hasSearched && hits.length === 0 ? (
        <p className="text-sm text-ink-500 mt-3 mb-0">{t('bars.searchNoResult')}</p>
      ) : null}
      <ul className="flex flex-col gap-1.5 mt-3 mb-0 p-0 list-none">
        {hits.map((hit) => (
          <li key={hit.placeId}>
            <button
              type="button"
              onClick={() => onPick(hit)}
              className={composeClassName(
                'flex flex-col items-start w-full text-left min-h-11 bg-bg-elev border border-line',
                'rounded-md px-3 py-2 cursor-pointer hover:border-line-strong transition-colors',
              )}
            >
              <span className="text-[13.5px] font-medium text-ink-900">{hit.name}</span>
              <span className="text-xs text-ink-500">{hit.address ?? ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
