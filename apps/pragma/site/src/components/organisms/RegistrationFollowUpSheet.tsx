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
import { AlbumCover } from '../atoms/AlbumCover';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { composeClassName } from '../atoms/class-name.utils';
import { inputVariants } from '../atoms/input.variants';
import { memberInitial } from '../atoms/member-palette.utils';
import { Sheet } from '../molecules/Sheet';
import { selectSuggestionOutcome } from './suggest-song.core';

const DEBOUNCE_MS = 600;
const SEARCH_INPUT_CLASS = composeClassName(inputVariants(), 'pl-9');
const HIT_CLASS =
  'flex w-full min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-left text-meta ' +
  'text-ink hover:bg-hover data-focus-visible:outline-3 data-focus-visible:outline-focus';
const QUESTION_CLASS = 'm-0 font-display text-title font-normal text-ink';
const MEMBER_CHIP_CLASS =
  'min-h-11 gap-2 border border-rule-strong bg-raised pr-3.5 pl-1.5 text-body font-normal ' +
  'data-selected:border-2 data-selected:border-accent data-selected:bg-accent-soft data-selected:text-ink';

interface WishedTrack {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly deezerAlbumId: string | null;
}

interface FollowUpValues {
  readonly comingForMemberId: string | null;
  readonly wishedTrack: WishedTrack | null;
}

const NO_ANSWER: FollowUpValues = { comingForMemberId: null, wishedTrack: null };

export interface RegistrationFollowUpSheetProps {
  readonly registration: StoredRegistration;
  readonly firstName: string;
  readonly onDone: () => void;
}

// @FollowsBlueprint organism-query-owning
export function RegistrationFollowUpSheet({
  registration,
  firstName,
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
      deezerAlbumId: hit.deezerAlbumId,
    });
    setTypedQuery('');
    setSettledQuery('');
  };

  const send = (): void => {
    void form.handleSubmit();
  };
  const title = t('concerts.followUpTitle', { firstName });

  return (
    <Sheet
      title={
        <span className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-good-soft text-good">
            <Icon name="check" size="md" />
          </span>
          <span className="font-semibold text-heading">{title}</span>
        </span>
      }
      label={title}
      isTitleARecordName
      onClose={onDone}
      footer={
        <div className="flex w-full gap-2.5">
          <Button
            icon="close"
            variant="quiet"
            size="lg"
            className="min-h-13 flex-auto border border-rule-strong"
            onClick={onDone}
          >
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
                size="lg"
                className="min-h-13 flex-[1.4]"
                disabled={!hasAnswer || amend.isPending}
                onClick={send}
              >
                {t('concerts.send')}
              </Button>
            )}
          </form.Subscribe>
        </div>
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
                    className={MEMBER_CHIP_CLASS}
                  >
                    <Avatar
                      initials={memberInitial(member.firstName)}
                      color={member.color}
                      size="md"
                      aria-hidden="true"
                    />
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
                          <AlbumCover title={hit.title} deezerAlbumId={hit.deezerAlbumId} />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium text-ink">{hit.title}</span>
                            <span className="truncate text-meta text-ink-soft">{hit.artist}</span>
                          </span>
                        </ListBoxItem>
                      )}
                    </ListBox>
                  )}
                </Autocomplete>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-md bg-accent-soft px-3 py-2">
                  <AlbumCover
                    title={field.state.value.title}
                    deezerAlbumId={field.state.value.deezerAlbumId}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
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
