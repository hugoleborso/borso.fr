/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import type { TextSaveDisplay } from './latest-text-save.utils';

export interface TextSaveStatusProps {
  readonly display: TextSaveDisplay;
  readonly onRetry: () => void;
}

const LINE_CLASS = 'm-0 flex min-h-9 items-center gap-1.5 text-meta';

// @FollowsBlueprint molecule-presentational
export function TextSaveStatus({ display, onRetry }: TextSaveStatusProps): JSX.Element {
  const { t } = useTranslation();
  const lineByDisplay = {
    none: <p className={LINE_CLASS} role="status" />,
    saving: (
      <p className={composeClassName(LINE_CLASS, 'text-ink-soft')} role="status">
        {t('setlist.noteSaving')}
      </p>
    ),
    saved: (
      <p className={composeClassName(LINE_CLASS, 'text-good')} role="status">
        <Icon name="check" />
        {t('setlist.noteSaved')}
      </p>
    ),
    failed: (
      <p className={composeClassName(LINE_CLASS, 'text-danger')} role="alert">
        {t('setlist.noteNotSaved')}
        <Button variant="quiet" size="sm" icon="refresh" onClick={onRetry}>
          {t('setlist.noteRetry')}
        </Button>
      </p>
    ),
  } as const;
  return lineByDisplay[display];
}
