/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { type ListenSubject, selectListenTargets } from '../../lib/listen-links.utils';
import { AlbumCover } from '../atoms/AlbumCover';
import { composeClassName } from '../atoms/class-name.utils';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { LineupSlots } from '../molecules/LineupSlots';
import type { LineupColumnView } from '../molecules/lineup-slots.core';
import { SetlistEntryActions } from '../molecules/SetlistEntryActions';
import { SetlistEntryKeyCapoFields } from '../molecules/SetlistEntryKeyCapoFields';
import { SetlistEntryNotesField } from '../molecules/SetlistEntryNotesField';
import { SetlistEntryEnergyField } from '../molecules/SetlistEntryEnergyField';
import type { SetlistEntryForm } from '../molecules/setlist-entry-form.hook';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';
import { MemberPartGlyphs, type MemberPartGlyph } from '../molecules/MemberPartGlyphs';

const LISTEN_LINK_CLASS =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-bg-sunk';
const PROVIDER_COLOR_CLASS = {
  deezer: 'text-[#a238ff]',
  spotify: 'text-[#1db954]',
} as const;
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
  readonly onPatch: (patch: SetlistEntryPatch) => void;
  readonly onEditLineupOverride: () => void;
  readonly onEditSongDefaults: () => void;
  readonly onRemove: () => void;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-form
export function SetlistEntrySheet(props: SetlistEntrySheetProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <dialog
      ref={openDismissibleDialogOnAttach}
      onClose={props.onClose}
      aria-label={props.subject.title}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[28rem] max-w-[28rem] max-h-[calc(100dvh-2rem)] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="relative p-4 flex flex-col gap-4">
        <Button
          type="button"
          variant="ghost"
          aria-label={t('common.close')}
          title={t('common.close')}
          className="absolute right-2 top-2 w-11 px-0"
          onClick={props.onClose}
        >
          <Icon name="close" size={18} />
        </Button>
        <div className="flex items-start gap-3">
          <div className="w-28 sm:w-36 shrink-0">
            <AlbumCover title={props.subject.title} deezerAlbumId={props.deezerAlbumId} size="xl" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="m-0 pr-9 font-display text-2xl italic leading-tight text-ink-900">
              {props.subject.title}
            </h2>
            <div className="flex items-center gap-2">
              <p className="m-0 min-w-0 truncate text-sm text-ink-500">{props.subject.artist}</p>
              {selectListenTargets(props.subject).map((target) => (
                <a
                  key={target.provider}
                  href={target.address}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={t(PROVIDER_LABEL_KEYS[target.provider])}
                  title={t(PROVIDER_LABEL_KEYS[target.provider])}
                  className={composeClassName(
                    LISTEN_LINK_CLASS,
                    PROVIDER_COLOR_CLASS[target.provider],
                  )}
                >
                  <Icon name={target.provider} size={22} />
                </a>
              ))}
            </div>
            {props.memberPart.length === 0 ? null : (
              <MemberPartGlyphs parts={props.memberPart} size={18} />
            )}
            <SetlistEntryKeyCapoFields form={props.form} onPatch={props.onPatch} />
          </div>
        </div>
        <button
          type="button"
          onClick={props.onEditLineupOverride}
          aria-label={t('lineup.editOverride')}
          className="flex min-h-11 w-full items-center overflow-hidden rounded-md border border-line bg-transparent px-2 cursor-pointer hover:border-line-strong"
        >
          <LineupSlots column={props.lineupColumn} />
        </button>
        <div className="flex min-h-11 items-center gap-3">
          <span className="text-sm text-ink-500">{t('setlist.energy')}</span>
          <SetlistEntryEnergyField
            entryEnergy={props.energy}
            songEnergy={props.baseEnergy}
            onPublish={props.onPublishEnergy}
          />
        </div>
        <SetlistEntryNotesField form={props.form} onPatch={props.onPatch} />
        <SetlistEntryActions
          onEditSongDefaults={props.onEditSongDefaults}
          onRemove={props.onRemove}
        />
      </div>
    </dialog>
  );
}
