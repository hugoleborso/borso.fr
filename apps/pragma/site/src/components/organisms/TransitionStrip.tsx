/** @Feature transitions */

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

const CARRIER_CHIP_OVERLAP_CLASS = '-ml-1 first:ml-0 rounded-full ring-2 ring-bg';

function CarrierStack({ view }: { view: TransitionView }): JSX.Element | null {
  if (view.carriers.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center">
      {view.carriers.map((carrier) => (
        <MemberChip
          key={carrier.memberId}
          memberName={carrier.memberName}
          memberColor={carrier.memberColor}
          title={`${carrier.memberName} — ${carrier.instrumentNames.join(' + ')}`}
          className={CARRIER_CHIP_OVERLAP_CLASS}
        />
      ))}
    </span>
  );
}

// @FollowsBlueprint organism-presentational
export function TransitionStrip({ view, note, onOpenNote }: TransitionStripProps): JSX.Element {
  const { t } = useTranslation();
  const hasNote = note.length > 0;

  if (view.kind !== 'risky') {
    return (
      <button
        type="button"
        onClick={onOpenNote}
        aria-label={t('setlist.openTransitionComment')}
        title={hasNote ? note : t('setlist.transitionCovered')}
        className="flex h-6 w-full cursor-pointer items-center justify-center gap-2 border-0 bg-transparent px-2"
      >
        <span className="h-px flex-1 bg-line" />
        <CarrierStack view={view} />
        {hasNote ? <Icon name="text" size={10} className="shrink-0 text-ink-400" /> : null}
        <span className="h-px flex-1 bg-line" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenNote}
      aria-label={t('setlist.openTransitionComment')}
      className={composeClassName(
        'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-sm border-0',
        'bg-warn-soft px-2 py-1 text-left',
      )}
    >
      <Icon name="warn" size={12} className="shrink-0 text-warn" />
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-warn">
        {t('setlist.transitionRisky')}
      </span>
      <CarrierStack view={view} />
      <span
        className={composeClassName(
          'min-w-0 flex-1 truncate text-xs',
          hasNote ? 'text-ink-700' : 'italic text-ink-400',
        )}
      >
        {hasNote ? note : t('setlist.transitionAddNote')}
      </span>
    </button>
  );
}
