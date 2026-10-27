/** @Feature transitions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { ListRow } from '../molecules/ListRow';
import { MemberChip } from '../molecules/MemberChip';
import type { TransitionView } from './transition-view.core';

export interface TransitionStripProps {
  readonly view: TransitionView;
  readonly note: string;
  readonly onOpenNote: () => void;
}

const COVERED_STRIP_HIT_AREA_CLASS =
  'relative after:absolute after:inset-x-0 after:-top-3 after:-bottom-2';
const RISKY_STRIP_HIT_AREA_CLASS = 'relative after:absolute after:inset-x-0 after:-inset-y-1';
const CARRIER_CHIP_OVERLAP_CLASS = '-ml-1 first:ml-0 rounded-full ring-2 ring-paper';

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
      <ListRow
        onClick={onOpenNote}
        aria-label={t('setlist.openTransitionComment')}
        title={hasNote ? note : t('setlist.transitionCovered')}
        isChevronShown={false}
        className={composeClassName(
          'h-6 min-h-6 justify-center gap-2 px-2',
          COVERED_STRIP_HIT_AREA_CLASS,
        )}
      >
        <span className="h-px flex-1 bg-rule" />
        <CarrierStack view={view} />
        <Icon name={hasNote ? 'text' : 'edit'} size="sm" className="shrink-0 text-ink-faint" />
        <span className="h-px flex-1 bg-rule" />
      </ListRow>
    );
  }

  return (
    <ListRow
      onClick={onOpenNote}
      aria-label={t('setlist.openTransitionComment')}
      isChevronShown={false}
      className={composeClassName(
        'min-h-9 gap-2 rounded-sm bg-warn-soft px-2 py-1',
        RISKY_STRIP_HIT_AREA_CLASS,
      )}
    >
      <Icon name="warn" size="sm" className="shrink-0 text-warn" />
      <span className="shrink-0 text-label font-semibold uppercase tracking-wider text-warn">
        {t('setlist.transitionRisky')}
      </span>
      <CarrierStack view={view} />
      <span
        className={composeClassName(
          'min-w-0 flex-1 truncate text-meta',
          hasNote ? 'font-display italic text-ink' : 'text-ink-soft',
        )}
      >
        {hasNote ? note : t('setlist.transitionAddNote')}
      </span>
    </ListRow>
  );
}
