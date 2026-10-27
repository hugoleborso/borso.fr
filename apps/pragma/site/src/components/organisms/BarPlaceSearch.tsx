/** @Feature bars */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from '../../lib/debounce.utils';
import { useBarPlaceSearch } from '../../lib/queries/bars.queries';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ListRow } from '../molecules/ListRow';

const DEBOUNCE_MS = 600;
const OPENSTREETMAP_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

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
  const hasSearched = debouncedQuery.length > 0 && !search.isFetching && search.error === null;

  return (
    <Card className="mb-5">
      <h3 className="font-display text-title text-ink m-0 mb-3">{t('bars.searchTitle')}</h3>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
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
      {search.error === null ? null : (
        <p className="text-meta text-danger mt-3 mb-0" role="alert">
          {t('bars.searchFailed')}
        </p>
      )}
      {search.isFetching ? (
        <p className="text-meta text-ink-soft italic mt-3 mb-0">{t('common.loading')}</p>
      ) : null}
      {hasSearched && hits.length === 0 ? (
        <p className="text-meta text-ink-soft mt-3 mb-0">{t('bars.searchNoResult')}</p>
      ) : null}
      <ul className="flex flex-col gap-1.5 mt-3 mb-0 p-0 list-none">
        {hits.map((hit) => (
          <li key={hit.placeId}>
            <ListRow
              onClick={() => onPick(hit)}
              className="rounded-md border border-rule bg-leaf px-3 py-2 transition-colors hover:border-rule-strong"
            >
              <span className="flex min-w-0 flex-col items-start">
                <span className="text-meta font-medium text-ink">{hit.name}</span>
                <span className="text-meta text-ink-soft">{hit.address ?? ''}</span>
              </span>
            </ListRow>
          </li>
        ))}
      </ul>
      <p className="text-meta text-ink-soft mt-3 mb-0">
        <a
          href={OPENSTREETMAP_COPYRIGHT_URL}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {t('bars.searchAttribution')}
        </a>
      </p>
    </Card>
  );
}
