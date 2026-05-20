/**
 * ChartKindIcon — the chart-format marker on a song card (the
 * prototype's top-right corner: text icon for ChordPro, pdf icon
 * for PDF, image icon for image, "pas d'accord" pill when nothing).
 */

import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';

export type ChartKind = 'chordpro' | 'pdf' | 'image' | null | undefined;

const KIND_ICON = {
  chordpro: 'text',
  pdf: 'pdf',
  image: 'image',
} as const;

export interface ChartKindIconProps {
  kind: ChartKind;
  size?: number;
}

export function ChartKindIcon({ kind, size = 14 }: ChartKindIconProps): JSX.Element {
  const { t } = useTranslation();
  if (kind === null || kind === undefined) {
    return (
      <span className="text-[10px] text-ink-300 italic">{t('catalog.noChartHint')}</span>
    );
  }
  return <Icon name={KIND_ICON[kind]} size={size} className="text-ink-400" />;
}
