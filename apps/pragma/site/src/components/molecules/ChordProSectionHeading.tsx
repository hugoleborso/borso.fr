/**
 * ChordProSectionHeading — names one block of a chord chart, so a
 * reader scanning the page mid-song lands on the right verse instead
 * of counting lines back from the top.
 *
 * The heading carries its own tone because the stage view reads on black:
 * the Badge atom's default surface disappears there, so the dark tone drops
 * the fill and keeps the dimmed stage ink that clears contrast on it.
 */

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
  readonly ordinal: number;
  readonly tone: ChordChartTone;
}

// @FollowsBlueprint molecule-presentational
export function ChordProSectionHeading({
  kind,
  label,
  ordinal,
  tone,
}: ChordProSectionHeadingProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Badge tone="mono" size="md" className={HEADING_CLASS_BY_TONE[tone]}>
      {buildSectionHeading(label ?? t(SECTION_LABEL_KEY[kind]), ordinal)}
    </Badge>
  );
}
