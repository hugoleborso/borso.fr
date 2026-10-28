/** @Feature practice-mode */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportEntryNoteSaveFailed } from '../../observability/error-reporting.adapter';
import { useLatestTextSave } from '../molecules/latest-text-save.hook';
import { selectTextSaveDisplay } from '../molecules/latest-text-save.utils';
import { SetlistEntryNotesField } from '../molecules/SetlistEntryNotesField';
import { useSetlistEntryForm } from '../molecules/setlist-entry-form.hook';
import { Sheet } from '../molecules/Sheet';
import { TextSaveStatus } from '../molecules/TextSaveStatus';

export interface PracticeNoteEntry {
  readonly id: string;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly notes: string;
}

export interface PracticeNoteSheetProps {
  readonly setlistId: string;
  readonly entry: PracticeNoteEntry;
  readonly songTitle: string;
  readonly onSaveNote: (text: string) => Promise<unknown>;
  readonly onClose: () => void;
}

// @FollowsBlueprint organism-form
export function PracticeNoteSheet(props: PracticeNoteSheetProps): JSX.Element {
  const { t } = useTranslation();
  const { entry } = props;
  const [hasTypedNote, setHasTypedNote] = useState(false);
  const form = useSetlistEntryForm({
    keyOverride: entry.keyOverride ?? '',
    capo: entry.capo === null ? '' : String(entry.capo),
    notes: entry.notes,
  });
  const notesSave = useLatestTextSave({
    savedText: entry.notes,
    save: (text) =>
      props.onSaveNote(text).catch((error: unknown) => {
        reportEntryNoteSaveFailed(props.setlistId);
        throw error;
      }),
  });
  const close = (): void => {
    notesSave.flush();
    props.onClose();
  };
  const title = t('practice.noteTitle', { title: props.songTitle });

  return (
    <Sheet title={title} label={title} onClose={close}>
      <div className="flex flex-col gap-1">
        <SetlistEntryNotesField
          form={form}
          isFocusedOnOpen
          onType={(text) => {
            setHasTypedNote(true);
            notesSave.type(text);
          }}
        />
        <TextSaveStatus
          display={selectTextSaveDisplay(notesSave.status, hasTypedNote)}
          onRetry={notesSave.flush}
        />
      </div>
    </Sheet>
  );
}
