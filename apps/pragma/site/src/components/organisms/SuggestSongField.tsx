/** @Feature audience-voting */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from '../../lib/debounce.utils';
import { useSuggestionSearch, useSuggestSong } from '../../lib/queries/audience.queries';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ListRow } from '../molecules/ListRow';
import { selectSuggestionOutcome } from './suggest-song.core';

const DEBOUNCE_MS = 600;

export interface SuggestSongFieldProps {
  readonly sessionId: string;
  readonly ballotToken: string | null;
}

// @FollowsBlueprint organism-query-owning
export function SuggestSongField({ sessionId, ballotToken }: SuggestSongFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [typedQuery, setTypedQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const publishSettledQuery = useMemo(
    () => debounce((nextQuery: string) => setSettledQuery(nextQuery), DEBOUNCE_MS),
    [],
  );
  const search = useSuggestionSearch(settledQuery);
  const suggestSong = useSuggestSong();

  const changeQuery = (nextQuery: string): void => {
    setTypedQuery(nextQuery);
    publishSettledQuery(nextQuery.trim());
  };

  const pickResult = (trackId: string): void => {
    if (ballotToken === null) return;
    suggestSong.mutate({ sessionId, trackId, ballotToken });
    setTypedQuery('');
    setSettledQuery('');
  };

  const outcome = selectSuggestionOutcome({
    query: settledQuery,
    isSearching: search.isFetching,
    searchError: search.error,
    hitCount: search.data?.hits.length ?? 0,
    writeError: suggestSong.error,
  });

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-title text-ink m-0">{t('audience.suggestTitle')}</h2>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
          <Icon name="search" />
        </span>
        <Input
          type="search"
          value={typedQuery}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder={t('audience.suggestPlaceholder')}
          className="pl-9"
          aria-label={t('audience.suggestTitle')}
          disabled={ballotToken === null}
        />
      </div>
      {outcome.messageKey === null ? null : (
        <p
          className="text-meta text-ink-soft italic"
          role={outcome.isFailure ? 'alert' : undefined}
        >
          {t(outcome.messageKey)}
        </p>
      )}
      {search.data === undefined ? null : (
        <ul className="m-0 flex list-none flex-col gap-1 rounded-md border border-rule bg-leaf p-1">
          {search.data.hits.map((hit) => (
            <li key={hit.deezerTrackId}>
              <ListRow
                onClick={() => pickResult(hit.deezerTrackId)}
                isChevronShown={false}
                className="flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-meta hover:bg-hover"
              >
                <span className="font-medium text-ink">{hit.title}</span>
                <span className="text-meta text-ink-soft">{hit.artist}</span>
              </ListRow>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
