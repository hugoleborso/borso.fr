import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ProofChipShape,
  selectProofChipShape,
  selectProofIcon,
} from '../../labours/labours-appearance.core';
import { buildProofChipText, selectProofLabel } from '../../labours/labours.core';
import type { Proof } from '../../labours/labours.types';
import { Chip, type ChipProps } from '../atoms/Chip';
import { ChipLink } from '../atoms/ChipLink';

const CHIP_CLASS_NAME =
  'inline-flex items-center gap-1.5 bg-labours-proof px-[9px] py-1 font-labours-sans text-[11px] tracking-[0.02em] text-labours-ink';

const CHIP_COMPONENT: Readonly<Record<ProofChipShape, ComponentType<ChipProps>>> = {
  link: ChipLink,
  plain: Chip,
};

interface ProofChipProps {
  proof: Proof;
}

// @FollowsBlueprint molecule-presentational
export function ProofChip({ proof }: ProofChipProps) {
  const { t } = useTranslation();
  const ChipShape = CHIP_COMPONENT[selectProofChipShape(proof.type)];
  const label = selectProofLabel(proof, t);
  return (
    <ChipShape address={proof.value} className={CHIP_CLASS_NAME}>
      <span className="font-semibold text-labours-accent">{selectProofIcon(proof.type)}</span>
      {buildProofChipText(proof, label)}
    </ChipShape>
  );
}
