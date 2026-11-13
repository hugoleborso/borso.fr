/** @Feature inspirations */

import { INSPIRATION_NOTE_MAX_LENGTH, SONG_TEXT_FIELD_MAX_LENGTH } from '@domain/input-limits.core';
import { buildYoutubeSearchUrl, parseYoutubeVideoId } from '@domain/inspiration.core';
import { useForm, useSelector } from '@tanstack/react-form';
import type { ParseKeys } from 'i18next';
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from '../../lib/debounce.utils';
import type { InspirationFieldsShape } from '../../lib/queries/inspiration-cache.core';
import { readInspirationRefusal } from '../../lib/queries/inspiration-refusal.core';
import { useSongSearch } from '../../lib/queries/songs.queries';
import type { PassagePlayerControl } from '../../lib/youtube-player.adapter';
import { AlbumCover } from '../atoms/AlbumCover';
import { AutoGrowTextarea } from '../atoms/AutoGrowTextarea';
import { Button } from '../atoms/Button';
import { ButtonAnchor } from '../atoms/ButtonAnchor';
import { HintText } from '../atoms/HintText';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { SongActionRow } from '../molecules/PickableSongRow';
import { Sheet } from '../molecules/Sheet';
import { formatDuration } from '../molecules/song-duration.utils';
import {
  applyPickedHit,
  changeTitle,
  INSPIRATION_FORM_REFUSAL_KEY,
  INSPIRATION_SAVE_FAILURE_KEY,
  type InspirationFormRefusal,
  type InspirationFormValues,
  type PickedDeezerHit,
  buildInspirationFields,
  readWholeSeconds,
  selectInspirationFormRefusal,
  shouldSearchDeezerFor,
} from './inspiration-form.core';
import { YoutubePassagePlayer } from './YoutubePassagePlayer';

export interface InspirationFormProps {
  readonly isNew: boolean;
  readonly initialValues: InspirationFormValues;
  readonly onSave: (fields: InspirationFieldsShape) => Promise<void>;
  readonly onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 400;
const FIELD_CLASS = 'flex flex-col gap-1 text-meta text-ink-soft';
const SECTION_LABEL_CLASS = 'text-label font-medium tracking-wider text-ink-soft uppercase';

// @FollowsBlueprint organism-form-sharing-the-domain-rule
export function InspirationForm({
  isNew,
  initialValues,
  onSave,
  onClose,
}: InspirationFormProps): JSX.Element {
  const { t } = useTranslation();
  const [refusal, setRefusal] = useState<InspirationFormRefusal | null>(null);
  const [saveFailureKey, setSaveFailureKey] = useState<ParseKeys | null>(null);
  const [searchedTitle, setSearchedTitle] = useState('');
  const playerControl = useRef<PassagePlayerControl | null>(null);
  const rememberPlayerControl = useCallback((control: PassagePlayerControl) => {
    playerControl.current = control;
  }, []);
  const publishSearchedTitle = useMemo(
    () => debounce((title: string) => setSearchedTitle(title), SEARCH_DEBOUNCE_MS),
    [],
  );

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const valueRefusal = selectInspirationFormRefusal(value);
      setRefusal(valueRefusal);
      setSaveFailureKey(null);
      const videoId = parseYoutubeVideoId(value.youtubeLink);
      if (valueRefusal !== null || videoId === null) return;
      try {
        await onSave(buildInspirationFields(value, videoId));
      } catch (error) {
        setSaveFailureKey(INSPIRATION_SAVE_FAILURE_KEY[readInspirationRefusal(error).kind]);
      }
    },
  });

  const deezerTrackId = useSelector(form.store, (state) => state.values.deezerTrackId);
  const isSearching = shouldSearchDeezerFor(searchedTitle, deezerTrackId);
  const search = useSongSearch(isSearching ? searchedTitle : '');
  const hits = isSearching ? (search.data?.hits ?? []) : [];

  const writeTrackFields = (next: InspirationFormValues): void => {
    form.setFieldValue('title', next.title);
    form.setFieldValue('artist', next.artist);
    form.setFieldValue('deezerTrackId', next.deezerTrackId);
    form.setFieldValue('deezerAlbumId', next.deezerAlbumId);
  };

  const typeTitle = (title: string): void => {
    writeTrackFields(changeTitle(form.state.values, title));
    publishSearchedTitle(title.trim());
  };

  const pickHit = (hit: PickedDeezerHit): void => {
    writeTrackFields(applyPickedHit(form.state.values, hit));
  };

  const setSecondHere = (field: 'startSeconds' | 'endSeconds'): void => {
    const second = playerControl.current?.readCurrentSecond() ?? form.state.values[field];
    form.setFieldValue(field, second);
  };

  const sheetTitle = isNew ? t('inspirations.new') : t('inspirations.edit');

  return (
    <Sheet
      title={sheetTitle}
      label={sheetTitle}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button icon="check" type="submit" variant="primary" size="lg" disabled={isSubmitting}>
              {isNew ? t('common.add') : t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-3">
        <form.Subscribe
          selector={(state) => [state.values.title, state.values.deezerAlbumId] as const}
        >
          {([title, deezerAlbumId]) => (
            <label className={FIELD_CLASS}>
              {t('inspirations.fields.title')}
              <span className="flex items-center gap-3">
                {deezerAlbumId === null ? null : (
                  <AlbumCover title={title} deezerAlbumId={deezerAlbumId} />
                )}
                <Input
                  data-sheet-focus
                  value={title}
                  maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
                  enterKeyHint="search"
                  onChange={(event) => typeTitle(event.target.value)}
                />
              </span>
            </label>
          )}
        </form.Subscribe>
        {hits.length === 0 ? null : (
          <section className="flex flex-col gap-1">
            <h2 className={SECTION_LABEL_CLASS}>{t('inspirations.searchResults')}</h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {hits.map((hit) => (
                <li key={hit.deezerTrackId}>
                  <SongActionRow
                    title={hit.title}
                    detail={hit.artist}
                    leading={<AlbumCover title={hit.title} deezerAlbumId={hit.deezerAlbumId} />}
                    isDisabled={false}
                    onSelect={() => pickHit(hit)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
        <form.Field name="artist">
          {(field) => (
            <label className={FIELD_CLASS}>
              {t('inspirations.fields.artist')}
              <Input
                value={field.state.value}
                maxLength={SONG_TEXT_FIELD_MAX_LENGTH}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => [state.values.artist, state.values.title] as const}>
          {([artist, title]) => (
            <span className="self-start">
              <ButtonAnchor
                href={buildYoutubeSearchUrl(artist, title)}
                mark={<Icon name="search" />}
                size="sm"
              >
                {t('inspirations.searchOnYoutube')}
              </ButtonAnchor>
            </span>
          )}
        </form.Subscribe>
        <form.Field name="youtubeLink">
          {(field) => (
            <label className={FIELD_CLASS}>
              {t('inspirations.fields.youtubeLink')}
              <Input
                type="url"
                inputMode="url"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Subscribe
          selector={(state) => [state.values.youtubeLink, state.values.title] as const}
        >
          {([youtubeLink, title]) => {
            const videoId = parseYoutubeVideoId(youtubeLink);
            return videoId === null ? null : (
              <YoutubePassagePlayer
                key={videoId}
                title={title}
                videoId={videoId}
                startSeconds={initialValues.startSeconds}
                endSeconds={null}
                isAutoplayed={false}
                onControl={rememberPlayerControl}
              />
            );
          }}
        </form.Subscribe>
        <div className="grid grid-cols-2 gap-3">
          <form.Field name="startSeconds">
            {(field) => (
              <div className="flex flex-col gap-1">
                <label className={FIELD_CLASS}>
                  <span>
                    {t('inspirations.fields.start')}{' '}
                    <span className="font-mono text-ink">{formatDuration(field.state.value)}</span>
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={String(field.state.value)}
                    onChange={(event) => field.handleChange(readWholeSeconds(event.target.value))}
                  />
                </label>
                <Button
                  icon="play"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSecondHere('startSeconds')}
                >
                  {t('inspirations.setStartHere')}
                </Button>
              </div>
            )}
          </form.Field>
          <form.Field name="endSeconds">
            {(field) => (
              <div className="flex flex-col gap-1">
                <label className={FIELD_CLASS}>
                  <span>
                    {t('inspirations.fields.end')}{' '}
                    <span className="font-mono text-ink">{formatDuration(field.state.value)}</span>
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={String(field.state.value)}
                    onChange={(event) => field.handleChange(readWholeSeconds(event.target.value))}
                  />
                </label>
                <Button
                  icon="pause"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSecondHere('endSeconds')}
                >
                  {t('inspirations.setEndHere')}
                </Button>
              </div>
            )}
          </form.Field>
        </div>
        <form.Field name="note">
          {(field) => (
            <label className={FIELD_CLASS}>
              {t('inspirations.fields.note')}
              <AutoGrowTextarea
                value={field.state.value}
                maxLength={INSPIRATION_NOTE_MAX_LENGTH}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
        {refusal === null ? null : (
          <HintText tone="danger" role="alert">
            {t(INSPIRATION_FORM_REFUSAL_KEY[refusal])}
          </HintText>
        )}
        {saveFailureKey === null ? null : (
          <HintText tone="danger" role="alert">
            {t(saveFailureKey)}
          </HintText>
        )}
      </div>
    </Sheet>
  );
}
