/** @Feature transitions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { ListRow } from '../molecules/ListRow';
import type { TransitionView } from './transition-view.core';

export interface TransitionStripProps {
  readonly view: TransitionView;
  readonly note: string;
  readonly onOpenNote: () => void;
}

const LINE_CLASS = 'min-h-11 gap-2 px-2 py-1 text-meta';

// @FollowsBlueprint organism-presentational
export function TransitionStrip({ view, note, onOpenNote }: TransitionStripProps): JSX.Element {
  const { t } = useTranslation();
  const hasNote = note.length > 0;
  const isRisky = view.kind === 'risky';
  return (
    <ListRow
      onClick={onOpenNote}
      aria-label={hasNote ? t('setlist.editTransitionNote') : t('setlist.noteTransition')}
      isChevronShown={false}
      data-transition-line
      data-transition-risky={isRisky ? true : undefined}
      className={LINE_CLASS}
    >
      <Icon
        name={isRisky ? 'warn' : hasNote ? 'edit' : 'plus'}
        className={composeClassName('shrink-0', isRisky ? 'text-warn' : 'text-ink-faint')}
      />
      {isRisky ? (
        <span className="shrink-0 text-label font-semibold tracking-wider text-warn uppercase">
          {t('setlist.transitionRisky')}
        </span>
      ) : null}
      <span
        className={composeClassName(
          'min-w-0 flex-1 text-left',
          hasNote ? 'font-display text-pencil italic' : 'text-ink-faint',
        )}
      >
        {hasNote ? note : t('setlist.noteTransition')}
      </span>
    </ListRow>
  );
}
