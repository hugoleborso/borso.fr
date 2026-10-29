/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/molecules/PageHeader';
import { AddSongForm } from '../../components/organisms/AddSongForm';
import { ADD_SONG_TITLE_PARAMETER } from './add-song.core';

// @FollowsBlueprint route-list-page
export function AddSongPage(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  return (
    <section className="flex max-w-3xl flex-col gap-2 px-4 py-4 sm:px-9 sm:py-7">
      <PageHeader
        back={{ to: '/catalog', label: t('catalog.title') }}
        title={t('catalog.addSongTitle')}
        className="mb-1 sm:mb-2"
      />
      <AddSongForm initialTitle={searchParams.get(ADD_SONG_TITLE_PARAMETER) ?? ''} />
    </section>
  );
}
