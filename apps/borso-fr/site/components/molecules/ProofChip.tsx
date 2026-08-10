import type { ComponentType, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ProofChipShape,
  selectProofChipShape,
  selectProofIcon,
} from '../../labours/labours-appearance.core';
import { buildProofChipText, selectProofLabel } from '../../labours/labours.core';
import type { Proof } from '../../labours/labours.types';
import { ACCENT, INK, PROOF_BACKGROUND, SANS_FAMILY } from '../../theme/twelve-labours.theme';
import { Chip, type ChipProps } from '../atoms/Chip';
import { ChipLink } from '../atoms/ChipLink';

const CHIP_STYLE: CSSProperties = {
  fontFamily: SANS_FAMILY,
  fontSize: 11,
  color: INK,
  background: PROOF_BACKGROUND,
  padding: '4px 9px',
  letterSpacing: '0.02em',
  display: 'inline-flex',
  gap: 6,
  alignItems: 'center',
  textDecoration: 'none',
};

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
    <ChipShape address={proof.value} style={CHIP_STYLE}>
      <span style={{ color: ACCENT, fontWeight: 600 }}>{selectProofIcon(proof.type)}</span>
      {buildProofChipText(proof, label)}
    </ChipShape>
  );
}
