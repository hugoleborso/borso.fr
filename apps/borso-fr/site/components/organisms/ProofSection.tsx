import type { ComponentType, CSSProperties } from 'react';
import { buildProofKey, type ProofSectionKind } from '../../labours/labours.core';
import type { Challenge, Proof } from '../../labours/labours.types';
import { ProofChip } from '../molecules/ProofChip';
import { ProofMedia } from '../molecules/ProofMedia';

const SECTION_MARGIN_TOP_PX = 12;

const SECTION_STYLE: Readonly<Record<ProofSectionKind, CSSProperties>> = {
  media: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    paddingBottom: 4,
    marginTop: SECTION_MARGIN_TOP_PX,
  },
  chip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SECTION_MARGIN_TOP_PX,
  },
};

const PROOF_COMPONENT: Readonly<Record<ProofSectionKind, ComponentType<{ proof: Proof }>>> = {
  media: ProofMedia,
  chip: ProofChip,
};

interface ProofSectionProps {
  challenge: Challenge;
  kind: ProofSectionKind;
  proofs: readonly Proof[];
}

// @FollowsBlueprint organism-table-dispatch
export function ProofSection({ challenge, kind, proofs }: ProofSectionProps) {
  const ProofItem = PROOF_COMPONENT[kind];
  return (
    <div style={SECTION_STYLE[kind]}>
      {proofs.map((proof) => (
        <ProofItem key={buildProofKey(challenge, proof)} proof={proof} />
      ))}
    </div>
  );
}
