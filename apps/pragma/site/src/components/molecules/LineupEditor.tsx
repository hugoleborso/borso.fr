/**
 * LineupEditor — modal that edits a lineup record
 * (`Record<memberId, instrumentId | null>`). Two surfaces share this
 * molecule: the song detail page (editing the song's `defaultLineup`)
 * and a setlist entry row (editing the entry's `lineupOverride`).
 *
 * On Save, the molecule normalises an all-null selection set to
 * `null` so the BE never persists `{}` — the override-vs-default
 * badge is binary on non-null.
 *
 * On Reset (only present when `onReset` is supplied — i.e. the
 * setlist-entry surface), the form returns to the supplied
 * `defaultLineup` values without saving, then a single Save click
 * clears the override (the parent wires `onReset` to write a
 * `lineupOverride: null` patch and closes the modal).
 */

import { useForm } from '@tanstack/react-form';
import { type JSX, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { MemberChip } from './MemberChip';

export type LineupRecord = Readonly<Record<string, string | null>>;

export interface LineupEditorMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface LineupEditorInstrument {
  readonly id: string;
  readonly name: string;
}

export type LineupEditorSurface = 'song' | 'setlist-entry';

export interface LineupEditorProps {
  readonly open: boolean;
  readonly surface: LineupEditorSurface;
  readonly members: readonly LineupEditorMember[];
  readonly instruments: readonly LineupEditorInstrument[];
  readonly currentLineup: LineupRecord;
  readonly onSave: (lineup: LineupRecord | null) => void;
  readonly onReset?: () => void;
  readonly onClose: () => void;
}

const NOT_PLAYING_OPTION_VALUE = '';
const FIELD_CLASS =
  'w-full bg-bg-elev border border-line rounded-md px-2 py-1 text-[13px] font-mono text-ink-900 outline-none focus:border-ink-700';

type FormValues = Record<string, string>;

function lineupToFormValues(
  lineup: LineupRecord,
  members: readonly LineupEditorMember[],
): FormValues {
  const values: FormValues = {};
  for (const member of members) {
    const stored = lineup[member.id];
    values[member.id] = stored === undefined || stored === null ? NOT_PLAYING_OPTION_VALUE : stored;
  }
  return values;
}

function formValuesToLineup(values: FormValues): LineupRecord | null {
  let hasAnyAssignment = false;
  const lineup: Record<string, string | null> = {};
  for (const [memberId, instrumentId] of Object.entries(values)) {
    if (instrumentId === NOT_PLAYING_OPTION_VALUE) continue;
    lineup[memberId] = instrumentId;
    hasAnyAssignment = true;
  }
  return hasAnyAssignment ? lineup : null;
}

export function LineupEditor(props: LineupEditorProps): JSX.Element | null {
  if (!props.open) return null;
  return <LineupEditorContent {...props} />;
}

function LineupEditorContent({
  surface,
  members,
  instruments,
  currentLineup,
  onSave,
  onReset,
  onClose,
}: LineupEditorProps): JSX.Element {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const form = useForm({
    defaultValues: lineupToFormValues(currentLineup, members),
    onSubmit: ({ value }) => {
      onSave(formValuesToLineup(value));
      onClose();
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  const handleResetToDefault = (): void => {
    if (onReset === undefined) return;
    onReset();
    onClose();
  };

  const modalTitle =
    surface === 'song' ? t('lineup.modal.title.song') : t('lineup.modal.title.setlistEntry');

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[28rem] max-w-[28rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="font-display italic text-xl text-ink-900 m-0">{modalTitle}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('common.cancel')}
        >
          ×
        </Button>
      </div>
      <form
        className="flex flex-col gap-2 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {members.map((member) => (
            <li
              key={member.id}
              className="grid grid-cols-[auto_1fr_minmax(0,11rem)] items-center gap-2"
            >
              <MemberChip memberName={member.name} memberColor={member.color} size="sm" />
              <label
                className="text-[13px] text-ink-900"
                htmlFor={`lineup-editor-instrument-${member.id}`}
              >
                {member.name}
              </label>
              <form.Field name={member.id}>
                {(field) => (
                  <select
                    id={`lineup-editor-instrument-${member.id}`}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    className={FIELD_CLASS}
                  >
                    <option value={NOT_PLAYING_OPTION_VALUE}>{t('lineup.notPlaying')}</option>
                    {instruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>
                        {instrument.name}
                      </option>
                    ))}
                  </select>
                )}
              </form.Field>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 mt-2 justify-between">
          {onReset !== undefined ? (
            <Button type="button" variant="ghost" onClick={handleResetToDefault}>
              {t('lineup.resetToDefault')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('lineup.cancel')}
            </Button>
            <Button type="submit" variant="accent">
              {t('lineup.save')}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
