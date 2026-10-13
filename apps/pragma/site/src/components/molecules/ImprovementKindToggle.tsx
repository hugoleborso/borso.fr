/** @Feature improvements */

import { type JSX, useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IMPROVEMENT_KINDS,
  type ImprovementKind,
  selectKindLabelKey,
} from '../../routes/improvements/improvements-page.core';
import { SegmentButton } from '../atoms/SegmentButton';

export interface ImprovementKindToggleProps {
  readonly kind: ImprovementKind;
  readonly onChange: (kind: ImprovementKind) => void;
}

// @FollowsBlueprint molecule-presentational
export function ImprovementKindToggle({ kind, onChange }: ImprovementKindToggleProps): JSX.Element {
  const { t } = useTranslation();
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1 text-xs text-ink-500">
      <span id={labelId}>{t('improvements.kindField')}</span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="inline-flex rounded-full border border-line bg-surface p-1 self-start"
      >
        {IMPROVEMENT_KINDS.map((candidate) => (
          <SegmentButton
            key={candidate}
            isSelected={candidate === kind}
            onSelect={() => onChange(candidate)}
          >
            {t(selectKindLabelKey(candidate))}
          </SegmentButton>
        ))}
      </div>
    </div>
  );
}
