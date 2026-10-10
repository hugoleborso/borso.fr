/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { type ListenSubject, selectListenTargets } from '../../lib/listen-links.utils';
import { AlbumCover } from '../atoms/AlbumCover';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { LineupSlots } from '../molecules/LineupSlots';
import type { LineupColumnView } from '../molecules/lineup-slots.core';
import { SetlistEntryActions } from '../molecules/SetlistEntryActions';
import { SetlistEntryDetailsFields } from '../molecules/SetlistEntryDetailsFields';
import { SetlistEntryEnergyField } from '../molecules/SetlistEntryEnergyField';
import type { SetlistEntryForm } from '../molecules/setlist-entry-form.hook';
import type { SetlistEntryPatch } from '../../lib/queries/setlist-entries.queries';

const PROVIDER_LABEL_KEYS = {
  deezer: 'catalog.listenOnDeezer',
  spotify: 'catalog.listenOnSpotify',
} as const;

export interface SetlistEntrySheetProps {
  readonly subject: ListenSubject;
  readonly deezerAlbumId: string | null;
  readonly memberPart: readonly string[];
  readonly lineupColumn: LineupColumnView;
  readonly energy: number | null;
  readonly baseEnergy: number | null;
  readonly form: SetlistEntryForm;
  readonly onPublishEnergy: (level: number) => void;
  readonly onPatch: (patch: SetlistEntryPatch) => void;
  readonly onEditLineupOverride: () => void;
  readonly onEditDefaultLineup: () => void;
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
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-28 sm:w-36 shrink-0">
            <AlbumCover title={props.subject.title} deezerAlbumId={props.deezerAlbumId} size="xl" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="m-0 font-display text-2xl italic leading-tight text-ink-900">
              {props.subject.title}
            </h2>
            <p className="m-0 text-sm text-ink-500">{props.subject.artist}</p>
            {props.memberPart.length === 0 ? null : (
              <p className="m-0 font-mono text-xs uppercase tracking-wider text-accent">
                {props.memberPart.join(' + ')}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label={t('common.close')}
            title={t('common.close')}
            className="w-11 px-0 shrink-0"
            onClick={props.onClose}
          >
            <Icon name="close" size={18} />
          </Button>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {selectListenTargets(props.subject).map((target) => (
            <li key={target.provider}>
              <a
                href={target.address}
                target="_blank"
                rel="noreferrer noopener"
                className="flex min-h-11 items-center gap-2 rounded-md border border-line px-2.5 text-[13px] text-ink-900 no-underline hover:border-line-strong hover:bg-bg"
              >
                <Icon name={target.provider} />
                {t(PROVIDER_LABEL_KEYS[target.provider])}
              </a>
            </li>
          ))}
        </ul>
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
        <SetlistEntryDetailsFields form={props.form} onPatch={props.onPatch} />
        <SetlistEntryActions
          onEditLineupOverride={props.onEditLineupOverride}
          onEditDefaultLineup={props.onEditDefaultLineup}
          onEditSongDefaults={props.onEditSongDefaults}
          onRemove={props.onRemove}
        />
      </div>
    </dialog>
  );
}
