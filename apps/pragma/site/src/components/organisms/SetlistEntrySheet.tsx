/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { type ListenSubject, selectListenTargets } from '../../lib/listen-links.utils';
import { AlbumCover } from '../atoms/AlbumCover';
import { BrandLogo } from '../atoms/BrandLogo';
import { LineupSlots } from '../molecules/LineupSlots';
import { ListRow } from '../molecules/ListRow';
import type { LineupColumnView } from '../molecules/lineup-slots.core';
import { SetlistEntryActions } from '../molecules/SetlistEntryActions';
import { SetlistEntryKeyCapoFields } from '../molecules/SetlistEntryKeyCapoFields';
import { SetlistEntryNotesField } from '../molecules/SetlistEntryNotesField';
import { SetlistEntryEnergyField } from '../molecules/SetlistEntryEnergyField';
import type { SetlistEntryForm } from '../molecules/setlist-entry-form.hook';
import { MemberPartGlyphs, type MemberPartGlyph } from '../molecules/MemberPartGlyphs';
import { Sheet } from '../molecules/Sheet';

const LISTEN_LINK_CLASS =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-pill hover:bg-hover';
const PROVIDER_LABEL_KEYS = {
  deezer: 'catalog.listenOnDeezer',
  spotify: 'catalog.listenOnSpotify',
} as const;

export interface SetlistEntrySheetProps {
  readonly subject: ListenSubject;
  readonly deezerAlbumId: string | null;
  readonly memberPart: readonly MemberPartGlyph[];
  readonly lineupColumn: LineupColumnView;
  readonly energy: number | null;
  readonly baseEnergy: number | null;
  readonly form: SetlistEntryForm;
  readonly onPublishEnergy: (level: number) => void;
  readonly onNotesType: (text: string) => void;
  readonly onKeyType: (text: string) => void;
  readonly onCapoType: (text: string) => void;
  readonly onEditLineupOverride: () => void;
  readonly onEditSongDefaults: () => void;
  readonly onRemove: () => void;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-form
export function SetlistEntrySheet(props: SetlistEntrySheetProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Sheet
      title={props.subject.title}
      label={props.subject.title}
      isTitleARecordName
      onClose={props.onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-28 sm:w-36 shrink-0">
            <AlbumCover title={props.subject.title} deezerAlbumId={props.deezerAlbumId} size="xl" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="m-0 min-w-0 truncate text-meta text-ink-soft">{props.subject.artist}</p>
              {selectListenTargets(props.subject).map((target) => (
                <a
                  key={target.provider}
                  href={target.address}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={t(PROVIDER_LABEL_KEYS[target.provider])}
                  title={t(PROVIDER_LABEL_KEYS[target.provider])}
                  className={LISTEN_LINK_CLASS}
                >
                  <BrandLogo brand={target.provider} size={24} />
                </a>
              ))}
            </div>
            {props.memberPart.length === 0 ? null : (
              <MemberPartGlyphs parts={props.memberPart} size="md" />
            )}
            <SetlistEntryKeyCapoFields
              form={props.form}
              onKeyType={props.onKeyType}
              onCapoType={props.onCapoType}
            />
          </div>
        </div>
        <ListRow
          onClick={props.onEditLineupOverride}
          aria-label={t('lineup.editOverride')}
          className="overflow-hidden rounded-md border border-rule px-2 hover:border-rule-strong"
        >
          <LineupSlots column={props.lineupColumn} />
        </ListRow>
        <div className="flex min-h-11 items-center gap-3">
          <span className="text-meta text-ink-soft">{t('setlist.energy')}</span>
          <SetlistEntryEnergyField
            entryEnergy={props.energy}
            songEnergy={props.baseEnergy}
            onPublish={props.onPublishEnergy}
          />
        </div>
        <SetlistEntryNotesField form={props.form} onType={props.onNotesType} />
        <SetlistEntryActions
          onEditSongDefaults={props.onEditSongDefaults}
          onRemove={props.onRemove}
        />
      </div>
    </Sheet>
  );
}
