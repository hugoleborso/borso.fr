/** @Feature audience-voting */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from '../../lib/debounce.utils';
import { useSuggestionSearch, useSuggestSong } from '../../lib/queries/audience.queries';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
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
      <h2 className="font-display italic text-xl text-ink-900 m-0">{t('audience.suggestTitle')}</h2>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
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
        <p className="text-xs text-ink-500 italic" role={outcome.isFailure ? 'alert' : undefined}>
          {t(outcome.messageKey)}
        </p>
      )}
      {search.data === undefined ? null : (
        <ul className="list-none p-1 m-0 flex flex-col gap-1 border border-line rounded-md bg-bg-elev max-h-72 overflow-y-auto">
          {search.data.hits.map((hit) => (
            <li key={hit.trackId}>
              <button
                type="button"
                onClick={() => pickResult(hit.trackId)}
                className="w-full text-left px-2 py-2 rounded text-sm text-ink-700 flex flex-col gap-0.5"
              >
                <span className="font-medium text-ink-900">{hit.title}</span>
                <span className="text-xs text-ink-500">{hit.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
