import type { ComponentType } from 'react';
import { buildProofKey, type ProofSectionKind } from '../../labours/labours.core';
import type { Challenge, Proof } from '../../labours/labours.types';
import { ProofChip } from '../molecules/ProofChip';
import { ProofMedia } from '../molecules/ProofMedia';

const SECTION_CLASS_NAME: Readonly<Record<ProofSectionKind, string>> = {
  media: 'mt-3 flex snap-x snap-mandatory flex-row gap-2 overflow-x-auto pb-1',
  chip: 'mt-3 flex flex-wrap gap-1.5',
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
    <div className={SECTION_CLASS_NAME[kind]}>
      {proofs.map((proof) => (
        <ProofItem key={buildProofKey(challenge, proof)} proof={proof} />
      ))}
    </div>
  );
}
