/** @Feature improvements */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ImprovementKind,
  selectKindBadgeKey,
} from '../../routes/improvements/improvements-page.core';
import { Badge } from '../atoms/Badge';

export interface ImprovementKindBadgeProps {
  readonly kind: ImprovementKind;
}

// @FollowsBlueprint molecule-presentational
export function ImprovementKindBadge({ kind }: ImprovementKindBadgeProps): JSX.Element | null {
  const { t } = useTranslation();
  const badgeKey = selectKindBadgeKey(kind);
  if (badgeKey === null) return null;
  return <Badge tone="warn">{t(badgeKey)}</Badge>;
}
