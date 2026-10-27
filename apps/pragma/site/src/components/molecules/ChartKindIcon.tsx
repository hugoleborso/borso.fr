/** @Feature songs */

import { useTranslation } from 'react-i18next';
import { Icon, type IconSize } from '../atoms/Icon';

export type ChartKind = 'chordpro' | 'pdf' | 'image' | null | undefined;

const KIND_ICON = {
  chordpro: 'text',
  pdf: 'pdf',
  image: 'image',
} as const;

export interface ChartKindIconProps {
  kind: ChartKind;
  size?: IconSize;
}

// @FollowsBlueprint molecule-presentational
export function ChartKindIcon({ kind, size = 'sm' }: ChartKindIconProps): JSX.Element {
  const { t } = useTranslation();
  if (kind === null || kind === undefined) {
    return <span className="text-meta text-ink-faint">{t('catalog.noChartHint')}</span>;
  }
  return <Icon name={KIND_ICON[kind]} size={size} className="text-ink-soft" />;
}
