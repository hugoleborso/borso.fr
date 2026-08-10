import { useTranslation } from 'react-i18next';
import { selectStatusLabelKey, selectStatusTagColors } from '../../labours/labours-appearance.core';
import type { ChallengeStatus } from '../../labours/labours.types';
import { Tag, type TagSize } from '../atoms/Tag';

interface ChallengeStatusTagProps {
  status: ChallengeStatus;
  size: TagSize;
}

export function ChallengeStatusTag({ status, size }: ChallengeStatusTagProps) {
  const { t } = useTranslation();
  const colors = selectStatusTagColors(status);
  return (
    <Tag
      label={t(selectStatusLabelKey(status))}
      foreground={colors.foreground}
      background={colors.background}
      borderColor={colors.borderColor}
      size={size}
    />
  );
}
