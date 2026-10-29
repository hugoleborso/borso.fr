/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongSaveRefusal } from '../../lib/queries/song-save-refusal.core';
import { SONG_EDIT_SECTIONS, type SongEditSection } from '../../routes/catalog/song-edit-page.core';
import { Button } from '../atoms/Button';
import type { IconName } from '../atoms/Icon';
import { DeezerTrackTakenNotice } from '../molecules/DeezerTrackTakenNotice';
import { PageHeader, type PageHeaderBack } from '../molecules/PageHeader';
import { SectionTabs } from '../molecules/SectionTabs';

export interface SongEditHeaderProps {
  readonly back: PageHeaderBack;
  readonly crumb: string;
  readonly title: string;
  readonly formId: string;
  readonly isSaveDisabled: boolean;
  readonly section: SongEditSection;
  readonly onSectionChange: (section: SongEditSection) => void;
  readonly refusal: SongSaveRefusal;
}

const SECTION_LABEL_KEY = {
  identity: 'catalog.editSectionIdentity',
  music: 'catalog.editSectionMusic',
  notes: 'catalog.editSectionNotes',
  lineup: 'catalog.editSectionLineup',
} as const satisfies Readonly<Record<SongEditSection, string>>;
const SECTION_ICON = {
  identity: 'catalog',
  music: 'song',
  notes: 'text',
  lineup: 'members',
} as const satisfies Readonly<Record<SongEditSection, IconName>>;

// @FollowsBlueprint organism-presentational
export function SongEditHeader(props: SongEditHeaderProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <PageHeader
      back={props.back}
      crumb={props.crumb}
      title={props.title}
      className="mb-0 sm:mb-0"
      actions={
        <Button
          icon="check"
          type="submit"
          form={props.formId}
          variant="primary"
          disabled={props.isSaveDisabled}
        >
          {t('common.save')}
        </Button>
      }
    >
      <SectionTabs
        label={t('catalog.editSectionsLabel')}
        tabs={SONG_EDIT_SECTIONS.map((option) => ({
          value: option,
          label: t(SECTION_LABEL_KEY[option]),
          icon: SECTION_ICON[option],
        }))}
        value={props.section}
        layout="stacked"
        onChange={props.onSectionChange}
      />
      {props.refusal.failureMessage === null ? null : (
        <p className="m-0 mt-2 text-meta text-danger" role="alert">
          {props.refusal.failureMessage}
        </p>
      )}
      {props.refusal.takenTrack === null ? null : (
        <DeezerTrackTakenNotice takenTrack={props.refusal.takenTrack} />
      )}
    </PageHeader>
  );
}
