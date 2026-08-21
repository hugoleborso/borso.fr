import { useTranslation } from 'react-i18next';
import { buildSectionHeading, type LabelledSectionKind } from '../../lib/chordpro.utils';
import type { ChordChartTone } from '../atoms/chart-tone';
import { Badge } from '../atoms/Badge';

const SECTION_LABEL_KEY = {
  verse: 'scene.sectionVerse',
  chorus: 'scene.sectionChorus',
  bridge: 'scene.sectionBridge',
  tab: 'scene.sectionTab',
} as const;

const HEADING_CLASS_BY_TONE = {
  light: 'uppercase tracking-wider',
  dark: 'uppercase tracking-wider bg-transparent text-stage-ink-dim border border-stage-ink-dim',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

export interface ChordProSectionHeadingProps {
  readonly kind: LabelledSectionKind;
  readonly label: string | null;
  readonly ordinalAmongKind: number;
  readonly tone: ChordChartTone;
}

// @FollowsBlueprint molecule-presentational
export function ChordProSectionHeading({
  kind,
  label,
  ordinalAmongKind,
  tone,
}: ChordProSectionHeadingProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Badge tone="mono" size="md" className={HEADING_CLASS_BY_TONE[tone]}>
      {buildSectionHeading(label ?? t(SECTION_LABEL_KEY[kind]), ordinalAmongKind)}
    </Badge>
  );
}
