/**
 * The strip drawn between two consecutive setlist rows. It is always
 * present — a transition that goes well is as worth reading as one that
 * does not — and it says three things: whether somebody keeps a harmonic
 * instrument across the pair, who can therefore carry the gap, and the
 * note the band left on it.
 *
 * The whole strip is one button, so a note is one tap away on a phone
 * rather than a marker in a desktop-only gutter.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { MemberChip } from '../molecules/MemberChip';
import type { TransitionView } from './transition-view.core';

export interface TransitionStripProps {
  readonly view: TransitionView;
  readonly note: string;
  readonly onOpenNote: () => void;
}

// @FollowsBlueprint organism-presentational
export function TransitionStrip({ view, note, onOpenNote }: TransitionStripProps): JSX.Element {
  const { t } = useTranslation();
  const isRisky = view.kind === 'risky';
  const hasNote = note.length > 0;
  return (
    <button
      type="button"
      onClick={onOpenNote}
      aria-label={t('setlist.openTransitionComment')}
      className={composeClassName(
        'w-full text-left flex flex-col gap-1 rounded-md border border-dashed px-3 py-2 cursor-pointer transition-colors',
        isRisky
          ? 'border-warn bg-warn-soft hover:border-warn'
          : 'border-line bg-transparent hover:border-line-strong hover:bg-bg-sunk',
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={composeClassName(
            'inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider',
            isRisky ? 'text-warn font-semibold' : 'text-ink-400',
          )}
        >
          <Icon name={isRisky ? 'warn' : 'check'} size={11} />
          {isRisky ? t('setlist.transitionRisky') : t('setlist.transitionCovered')}
        </span>
        {view.carriers.length === 0 ? (
          <span className="text-[11.5px] italic text-ink-500">{t('setlist.transitionNobody')}</span>
        ) : (
          <span className="flex items-center gap-1.5 flex-wrap">
            {view.carriers.map((carrier) => (
              <span
                key={carrier.memberId}
                className={composeClassName(
                  'inline-flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 border',
                  carrier.role === 'harmonic'
                    ? 'border-line-strong bg-bg-elev'
                    : 'border-transparent bg-bg-sunk',
                )}
              >
                <MemberChip
                  memberName={carrier.memberName}
                  memberColor={carrier.memberColor}
                  size="sm"
                />
                <span className="text-[11px] text-ink-700">{carrier.memberName}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                  {carrier.instrumentNames.join(' + ')}
                </span>
              </span>
            ))}
          </span>
        )}
      </div>
      <span className="flex items-start gap-1.5 text-[11.5px]">
        <Icon name="text" size={11} className="mt-0.5 shrink-0 text-ink-300" />
        <span className={hasNote ? 'text-ink-700' : 'text-ink-400 italic'}>
          {hasNote ? note : t('setlist.transitionAddNote')}
        </span>
      </span>
    </button>
  );
}
