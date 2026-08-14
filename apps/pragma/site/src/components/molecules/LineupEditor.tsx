/**
 * LineupEditor — modal that edits a lineup record
 * (`Record<memberId, instrumentIds>`). Two surfaces share this molecule:
 * the song detail page (editing the song's `defaultLineup`) and a setlist
 * entry row (editing the entry's `lineupOverride`).
 *
 * Each member gets a row of instrument toggles rather than a dropdown,
 * because one person can hold several instruments at once — a drummer who
 * also sings — and because a toggle is a thumb-sized target where a native
 * select on a phone is a scroll wheel.
 *
 * Only the member list scrolls: the sheet is a flex column whose middle band
 * is the scroll container, so the title stays at the top and Save and Cancel
 * at the bottom whatever the band's size. They were sticky instead, which
 * keeps them on screen but paints them over whatever the sheet has not
 * scrolled past — the last member's bottom instrument chip was three quarters
 * behind the action row and swallowed every tap aimed at it.
 *
 * On Save, the molecule normalises a selection where nobody plays to
 * `null` so the BE never persists an override that says nothing — the
 * override-vs-default badge is binary on non-null.
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
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import {
  formValuesToLineup,
  type LineupEditorMember,
  type LineupRecord,
  lineupToFormValues,
  toggleInstrumentHeld,
} from './lineup-editor.core';
import { MemberChip } from './MemberChip';

export type { LineupEditorMember, LineupRecord };

export interface LineupEditorInstrument {
  readonly id: string;
  readonly name: string;
}

export type LineupEditorSurface = 'song' | 'setlist-entry';

/**
 * The scrollbar is drawn rather than left to the platform's overlay one, which
 * only appears once a scroll is already under way. A band long enough to
 * overflow the sheet showed its last instrument chip sliced by the action row
 * with nothing on screen saying the list continued.
 */
const MEMBER_SCROLLER_CLASS =
  'flex-1 overflow-y-auto flex flex-col gap-3 p-4 pb-8 ' +
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-bg-sunk ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-strong';

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

/**
 * @Blueprint molecule-dialog-form
 * @BlueprintName Molecule Dialog With A Form
 * @BlueprintUsage Use for a modal that edits a record and hands the result back to its parent.
 * @BlueprintDescription Returns null when closed and delegates to an inner component holding every hook, so no hook ever runs conditionally, and the native dialog opens itself through the module level ref callback `openDialogOnAttach` rather than an effect watching an open prop. Field state and validation go through `useForm`, and the conversions between the record and the form values live in the covered sibling core.
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
      ref={openDismissibleDialogOnAttach}
      onClose={onClose}
      className="m-auto w-[calc(100vw-1.5rem)] sm:w-[30rem] max-w-[30rem] max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-line bg-bg-elev">
        <h2 className="font-display italic text-xl text-ink-900 m-0">{modalTitle}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="min-w-11"
        >
          ×
        </Button>
      </div>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className={MEMBER_SCROLLER_CLASS}>
          <p className="text-xs text-ink-500 m-0">{t('lineup.multiInstrumentHint')}</p>
          <ul className="flex flex-col gap-3 m-0 p-0 list-none">
            {members.map((member) => (
              <li key={member.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <MemberChip memberName={member.name} memberColor={member.color} size="sm" />
                  <span className="text-[13px] text-ink-900 font-medium">{member.name}</span>
                </div>
                <form.Field name={member.id}>
                  {(field) => (
                    <div
                      className="flex flex-wrap gap-1.5"
                      role="group"
                      aria-label={`${member.name} — ${t('lineup.instruments')}`}
                    >
                      {instruments.map((instrument) => {
                        const isHeld = field.state.value.includes(instrument.id);
                        return (
                          <button
                            key={instrument.id}
                            type="button"
                            aria-pressed={isHeld}
                            onClick={() =>
                              field.handleChange(
                                toggleInstrumentHeld(field.state.value, instrument.id),
                              )
                            }
                            className={composeClassName(
                              'inline-flex items-center min-h-11 px-3 rounded-full border text-[12.5px] cursor-pointer transition-colors',
                              isHeld
                                ? 'bg-accent-soft border-accent text-accent font-medium'
                                : 'bg-bg border-line text-ink-500 hover:border-line-strong',
                            )}
                          >
                            {instrument.name}
                          </button>
                        );
                      })}
                      {field.state.value.length === 0 ? (
                        <span className="self-center text-xs italic text-ink-400 pl-1">
                          {t('lineup.notPlaying')}
                        </span>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 px-4 py-3 flex flex-wrap gap-2 justify-between border-t border-line bg-bg-elev">
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
