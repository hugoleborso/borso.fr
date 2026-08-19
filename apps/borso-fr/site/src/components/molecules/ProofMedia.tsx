import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { type MediaProofType, selectMediaProofType } from '../../labours/labours-appearance.core';
import { selectProofLabel } from '../../labours/labours.core';
import type { Proof } from '../../labours/labours.types';
import { CarouselImage } from '../atoms/CarouselImage';
import { CarouselVideo } from '../atoms/CarouselVideo';

const DECORATIVE_ALTERNATIVE_TEXT = '';

const CAROUSEL_ITEM_CLASS_NAME = 'block h-[220px] w-auto shrink-0 snap-start bg-labours-proof';

interface CarouselMediaProps {
  source: string;
  alternativeText: string;
  className: string;
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
    <Media
      source={proof.value}
      alternativeText={alternativeText}
      className={CAROUSEL_ITEM_CLASS_NAME}
    />
  );
}
