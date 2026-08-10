import type { ComponentType, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { type MediaProofType, selectMediaProofType } from '../../labours/labours-appearance.core';
import { selectProofLabel } from '../../labours/labours.core';
import type { Proof } from '../../labours/labours.types';
import { PROOF_BACKGROUND } from '../../theme/twelve-labours.theme';
import { CarouselImage } from '../atoms/CarouselImage';
import { CarouselVideo } from '../atoms/CarouselVideo';

const CAROUSEL_ITEM_HEIGHT_PX = 220;
const DECORATIVE_ALTERNATIVE_TEXT = '';

const CAROUSEL_ITEM_STYLE: CSSProperties = {
  display: 'block',
  height: CAROUSEL_ITEM_HEIGHT_PX,
  width: 'auto',
  flexShrink: 0,
  background: PROOF_BACKGROUND,
  scrollSnapAlign: 'start',
};

interface CarouselMediaProps {
  source: string;
  alternativeText: string;
  style: CSSProperties;
}

const MEDIA_COMPONENT: Readonly<Record<MediaProofType, ComponentType<CarouselMediaProps>>> = {
  photo: CarouselImage,
  video: CarouselVideo,
};

interface ProofMediaProps {
  proof: Proof;
}

// @FollowsBlueprint molecule-presentational
export function ProofMedia({ proof }: ProofMediaProps) {
  const { t } = useTranslation();
  const Media = MEDIA_COMPONENT[selectMediaProofType(proof.type)];
  const alternativeText = selectProofLabel(proof, t) ?? DECORATIVE_ALTERNATIVE_TEXT;
  return (
    <Media source={proof.value} alternativeText={alternativeText} style={CAROUSEL_ITEM_STYLE} />
  );
}
