/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  canTransposeDown,
  canTransposeUp,
  formatSemitoneOffset,
} from '../../routes/catalog/scene-view.core';
import { IconButton } from '../atoms/IconButton';

export interface TransposeStepperProps {
  readonly semitones: number;
  readonly onTransposeBy: (semitones: number) => void;
}

// @FollowsBlueprint molecule-presentational
export function TransposeStepper({ semitones, onTransposeBy }: TransposeStepperProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('catalog.transpose')} className="flex items-center gap-1">
      <IconButton
        variant="secondary"
        size="sm"
        icon="minus"
        label={t('scene.transposeDown')}
        disabled={!canTransposeDown(semitones)}
        onClick={() => onTransposeBy(-1)}
      />
      <span className="min-w-9 text-center font-mono text-meta text-ink tabular-nums">
        {formatSemitoneOffset(semitones)}
      </span>
      <IconButton
        variant="secondary"
        size="sm"
        icon="plus"
        label={t('scene.transposeUp')}
        disabled={!canTransposeUp(semitones)}
        onClick={() => onTransposeBy(1)}
      />
    </div>
  );
}
