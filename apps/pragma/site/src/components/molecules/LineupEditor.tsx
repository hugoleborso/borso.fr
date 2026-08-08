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
 * On Reset to default (button only present when `defaultLineup` is
 * supplied — i.e. the setlist-entry surface), the form values revert
 * to `defaultLineup` and the modal stays open so the operator can
 * review. A subsequent Save click invokes `onSave(lineup, true)` so
 * the parent persists `lineupOverride: null`. Without a prior Reset,
 * Save calls `onSave(lineup, false)` and the parent persists the form
 * values verbatim.
 */

import { useForm } from '@tanstack/react-form';
import { type JSX, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { openDialogOnAttach } from '../../lib/modal-dialog';
import { Button } from '../atoms/Button';
import {
  formValuesToLineup,
  type LineupEditorMember,
  type LineupRecord,
  lineupToFormValues,
  NOT_PLAYING_OPTION_VALUE,
} from './lineup-editor.core';
import { MemberChip } from './MemberChip';

export type { LineupEditorMember, LineupRecord };

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
  readonly defaultLineup?: LineupRecord;
  readonly onSave: (lineup: LineupRecord | null, wasReset: boolean) => void;
  readonly onClose: () => void;
}

const FIELD_CLASS =
  'w-full bg-bg-elev border border-line rounded-md px-2 py-1 text-[13px] font-mono text-ink-900 outline-none focus:border-ink-700';

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
  onSave,
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

  const modalTitle =
    surface === 'song' ? t('lineup.modal.title.song') : t('lineup.modal.title.setlistEntry');

  return (
    <dialog
      ref={openDialogOnAttach}
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
          {defaultLineup === undefined ? (
            <span />
          ) : (
            <Button type="button" variant="ghost" onClick={resetToDefaultLineup}>
              {t('lineup.resetToDefault')}
            </Button>
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
