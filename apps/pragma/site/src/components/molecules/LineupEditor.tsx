/** @Feature members */

import { useForm } from '@tanstack/react-form';
import { type JSX, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import {
  formValuesToLineup,
  type LineupEditorMember,
  type LineupRecord,
  lineupToFormValues,
  toggleInstrumentHeld,
} from './lineup-editor.core';
import { LineupMemberRow, type LineupMemberRowInstrument } from './LineupMemberRow';
import { Sheet } from './Sheet';

export type { LineupEditorMember, LineupRecord };

export type LineupEditorInstrument = LineupMemberRowInstrument;

export type LineupEditorSurface = 'song' | 'setlist-entry';

const OVERRIDE_BADGE_CLASS =
  'inline-flex shrink-0 items-center gap-1 rounded-full bg-highlight px-2 py-0.5 ' +
  'text-label text-on-highlight';

export interface LineupEditorProps {
  readonly open: boolean;
  readonly surface: LineupEditorSurface;
  readonly members: readonly LineupEditorMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly currentLineup: LineupRecord;
  readonly defaultLineup?: LineupRecord;
  readonly overridesSongDefault?: boolean;
  readonly onSave: (lineup: LineupRecord | null, wasReset: boolean) => void;
  readonly onSaveAsSongDefault?: (lineup: LineupRecord | null) => void;
  readonly onClose: () => void;
}

/**
 * @Blueprint molecule-dialog-form
 * @BlueprintName Molecule Dialog With A Form
 * @BlueprintUsage Use for a modal that edits a record and hands the result back to its parent.
 * @BlueprintDescription Returns null when closed and delegates to an inner component holding every hook, so no hook ever runs conditionally, and renders its form inside the Sheet molecule, which opens the native dialog through the module level ref callback `openDialogOnAttach` rather than an effect watching an open prop. Field state and validation go through `useForm`, and the conversions between the record and the form values live in the covered sibling core.
 */
export function LineupEditor(props: LineupEditorProps): JSX.Element | null {
  if (!props.open) return null;
  return <LineupEditorContent {...props} />;
}

function LineupEditorContent({
  surface,
  members,
  instruments,
  currentLineup,
  defaultLineup,
  overridesSongDefault = false,
  onSave,
  onSaveAsSongDefault,
  onClose,
}: LineupEditorProps): JSX.Element {
  const { t } = useTranslation();
  const wasResetRef = useRef<boolean>(false);
  const form = useForm({
    defaultValues: lineupToFormValues(currentLineup, members),
    onSubmit: ({ value }) => {
      onSave(formValuesToLineup(value), wasResetRef.current);
      onClose();
    },
  });

  const resetToDefaultLineup = (): void => {
    if (defaultLineup === undefined) return;
    wasResetRef.current = true;
    const nextValues = lineupToFormValues(defaultLineup, members);
    for (const [memberId, value] of Object.entries(nextValues)) {
      form.setFieldValue(memberId, value);
    }
  };

  const saveAsSongDefault = (): void => {
    onSaveAsSongDefault?.(formValuesToLineup(form.state.values));
    onClose();
  };

  const modalTitle =
    surface === 'song' ? t('lineup.modal.title.song') : t('lineup.modal.title.setlistEntry');

  return (
    <Sheet
      title={modalTitle}
      label={modalTitle}
      onClose={onClose}
      headerExtra={
        overridesSongDefault ? (
          <span className={OVERRIDE_BADGE_CLASS}>
            <Icon name="warn" />
            {t('lineup.override')}
          </span>
        ) : null
      }
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      footer={
        <Button type="submit" variant="primary" icon="check">
          {t('lineup.save')}
        </Button>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {members.map((member) => (
          <form.Field key={member.id} name={member.id}>
            {(field) => (
              <LineupMemberRow
                member={member}
                instruments={instruments}
                heldInstrumentIds={field.state.value}
                onToggle={(instrumentId) =>
                  field.handleChange(toggleInstrumentHeld(field.state.value, instrumentId))
                }
              />
            )}
          </form.Field>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {defaultLineup === undefined ? null : (
          <Button variant="quiet" size="sm" icon="swap" onClick={resetToDefaultLineup}>
            {t('lineup.resetToDefault')}
          </Button>
        )}
        {onSaveAsSongDefault === undefined ? null : (
          <Button variant="quiet" size="sm" icon="song" onClick={saveAsSongDefault}>
            {t('lineup.saveAsSongDefault')}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
