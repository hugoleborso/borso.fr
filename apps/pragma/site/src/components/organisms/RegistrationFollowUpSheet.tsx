/** @Feature concert-registrations */

import { useForm } from '@tanstack/react-form';
import { type JSX, useMemo, useState } from 'react';
import { Autocomplete, Input, ListBox, ListBoxItem, SearchField } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { debounce } from '../../lib/debounce.utils';
import { useSuggestionSearch } from '../../lib/queries/audience.queries';
import {
  useAmendRegistration,
  useConcertMemberNames,
} from '../../lib/queries/concert-registrations.queries';
import type { StoredRegistration } from '../../lib/registration-token.adapter';
import {
  selectFollowUpErrorKey,
  selectWishSearchLine,
  toggleChoice,
} from '../../routes/concerts/concert-sign-up.core';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { composeClassName } from '../atoms/class-name.utils';
import { inputVariants } from '../atoms/input.variants';
import { Sheet } from '../molecules/Sheet';
import { selectSuggestionOutcome } from './suggest-song.core';

const DEBOUNCE_MS = 600;
const SEARCH_INPUT_CLASS = composeClassName(inputVariants(), 'pl-9');
const HIT_CLASS =
  'flex w-full min-h-11 cursor-pointer flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left text-meta ' +
  'text-ink hover:bg-hover data-focus-visible:outline-3 data-focus-visible:outline-focus';
const QUESTION_CLASS = 'm-0 font-display text-heading text-ink';

interface WishedTrack {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
}

interface FollowUpValues {
  readonly comingForMemberId: string | null;
  readonly wishedTrack: WishedTrack | null;
}

const NO_ANSWER: FollowUpValues = { comingForMemberId: null, wishedTrack: null };

export interface RegistrationFollowUpSheetProps {
  readonly registration: StoredRegistration;
  readonly onDone: () => void;
}

// @FollowsBlueprint organism-query-owning
export function RegistrationFollowUpSheet({
  registration,
  onDone,
}: RegistrationFollowUpSheetProps): JSX.Element {
  const { t } = useTranslation();
  const members = useConcertMemberNames(true);
  const amend = useAmendRegistration();
  const form = useForm({
    defaultValues: NO_ANSWER,
    onSubmit: ({ value }) => {
      amend.mutate(
        {
          registration,
          comingForMemberId: value.comingForMemberId,
          wishedTrackId: value.wishedTrack?.id ?? null,
        },
        { onSuccess: onDone },
      );
    },
  });
  const [typedQuery, setTypedQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const publishSettledQuery = useMemo(
    () => debounce((nextQuery: string) => setSettledQuery(nextQuery), DEBOUNCE_MS),
    [],
  );
  const search = useSuggestionSearch(settledQuery);
  const hits = search.data?.hits ?? [];
  const outcome = selectSuggestionOutcome({
    query: settledQuery,
    isSearching: search.isFetching,
    searchError: search.error,
    hitCount: hits.length,
    writeError: null,
  });
  const searchLine = selectWishSearchLine(outcome);
  const followUpErrorKey = selectFollowUpErrorKey(amend.error);

  const changeQuery = (nextQuery: string): void => {
    setTypedQuery(nextQuery);
    publishSettledQuery(nextQuery.trim());
  };

  const pickTrack = (trackId: string): void => {
    const hit = hits.find((candidate) => candidate.deezerTrackId === trackId);
    if (hit === undefined) return;
    form.setFieldValue('wishedTrack', {
      id: hit.deezerTrackId,
      title: hit.title,
      artist: hit.artist,
    });
    setTypedQuery('');
    setSettledQuery('');
  };

  const send = (): void => {
    void form.handleSubmit();
  };

  return (
    <Sheet
      title={t('concerts.followUpTitle')}
      label={t('concerts.followUpTitle')}
      onClose={onDone}
      footer={
        <>
          <Button icon="close" variant="quiet" onClick={onDone}>
            {t('concerts.skip')}
          </Button>
          <form.Subscribe
            selector={(state) =>
              state.values.comingForMemberId !== null || state.values.wishedTrack !== null
            }
          >
            {(hasAnswer) => (
              <Button
                icon="check"
                variant="primary"
                disabled={!hasAnswer || amend.isPending}
                onClick={send}
              >
                {t('concerts.send')}
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h3 className={QUESTION_CLASS}>{t('concerts.comingForQuestion')}</h3>
          <form.Field name="comingForMemberId">
            {(field) => (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t('concerts.comingForQuestion')}
              >
                {(members.data?.members ?? []).map((member) => (
                  <Chip
                    key={member.id}
                    pressed={field.state.value === member.id}
                    onPress={() => field.handleChange(toggleChoice(field.state.value, member.id))}
                  >
                    {member.firstName}
                  </Chip>
                ))}
              </div>
            )}
          </form.Field>
        </section>
        <section className="flex flex-col gap-3">
          <h3 className={QUESTION_CLASS}>{t('concerts.wishQuestion')}</h3>
          <form.Field name="wishedTrack">
            {(field) =>
              field.state.value === null ? (
                <Autocomplete
                  inputValue={typedQuery}
                  onInputChange={changeQuery}
                  disableAutoFocusFirst
                >
                  <SearchField aria-label={t('concerts.wishQuestion')} className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none">
                      <Icon name="search" />
                    </span>
                    <Input
                      placeholder={t('concerts.wishPlaceholder')}
                      className={SEARCH_INPUT_CLASS}
                    />
                  </SearchField>
                  {searchLine === null ? null : (
                    <p
                      className="m-0 text-meta text-ink-soft italic"
                      role={searchLine.isFailure ? 'alert' : undefined}
                    >
                      {t(searchLine.messageKey)}
                    </p>
                  )}
                  {search.data === undefined ? null : (
                    <ListBox
                      aria-label={t('concerts.wishQuestion')}
                      items={hits}
                      onAction={(trackId) => pickTrack(String(trackId))}
                      className="m-0 flex list-none flex-col gap-1 rounded-md border border-rule bg-leaf p-1"
                    >
                      {(hit) => (
                        <ListBoxItem
                          id={hit.deezerTrackId}
                          textValue={hit.title}
                          className={HIT_CLASS}
                        >
                          <span className="font-medium text-ink">{hit.title}</span>
                          <span className="text-meta text-ink-soft">{hit.artist}</span>
                        </ListBoxItem>
                      )}
                    </ListBox>
                  )}
                </Autocomplete>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-md bg-accent-soft px-3 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-ink">{field.state.value.title}</span>
                    <span className="truncate text-meta text-ink-soft">
                      {field.state.value.artist}
                    </span>
                  </span>
                  <Button
                    icon="swap"
                    size="sm"
                    variant="quiet"
                    onClick={() => field.handleChange(null)}
                  >
                    {t('concerts.changeWish')}
                  </Button>
                </div>
              )
            }
          </form.Field>
        </section>
        {followUpErrorKey === null ? null : (
          <p className="m-0 text-meta text-danger" role="alert">
            {t(followUpErrorKey)}
          </p>
        )}
      </div>
    </Sheet>
  );
}
