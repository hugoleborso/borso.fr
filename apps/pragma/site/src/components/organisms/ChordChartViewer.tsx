/** @Feature songs */

import { useMemo } from 'react';
import {
  type ChordProLine,
  groupChordProSections,
  hasSectionHeading,
  isTitleDirective,
  parseChordPro,
  transposeLines,
} from '../../lib/chordpro.utils';
import type { ChordChartTone } from '../atoms/chart-tone';
import { ChordProSectionHeading } from '../molecules/ChordProSectionHeading';
import { composeClassName } from '../atoms/class-name.utils';

interface ChordChartViewerProps {
  readonly source: string;
  readonly semitones?: number;
  readonly compact?: boolean;
  readonly tone?: ChordChartTone;
}

const LYRIC_CLASS_BY_TONE = {
  light: 'text-ink-700',
  dark: 'text-stage-ink',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const TITLE_CLASS_BY_TONE = {
  light: 'text-ink-900',
  dark: 'text-stage-ink',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const DIRECTIVE_CLASS_BY_TONE = {
  light: 'text-ink-500',
  dark: 'text-stage-ink-dim',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const CHORD_CLASS_BY_TONE = {
  light: 'text-accent',
  dark: 'text-stage-chord',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const SIZE_CLASS_BY_DENSITY = {
  compact: 'text-[13px] leading-[1.7]',
  roomy: 'leading-[1.6]',
} as const;

const WRAPPED_LINE_CLASS = 'whitespace-pre-wrap break-words pl-6 -indent-6';

function renderLine(line: ChordProLine, key: string, tone: ChordChartTone): JSX.Element {
  if (line.kind === 'blank') return <div key={key} className="h-4" />;
  if (line.kind === 'directive' && isTitleDirective(line.name)) {
    return (
      <h3
        key={key}
        className={composeClassName(
          'font-display italic text-2xl m-0 mb-2 not-prose',
          TITLE_CLASS_BY_TONE[tone],
        )}
      >
        {line.value}
      </h3>
    );
  }
  if (line.kind === 'directive') {
    return (
      <p
        key={key}
        className={composeClassName('italic text-xs m-0', DIRECTIVE_CLASS_BY_TONE[tone])}
      >
        {line.value}
      </p>
    );
  }
  if (line.kind === 'plain-line') {
    return (
      <p
        key={key}
        className={composeClassName('m-0', WRAPPED_LINE_CLASS, LYRIC_CLASS_BY_TONE[tone])}
      >
        {line.text}
      </p>
    );
  }
  return (
    <div key={key} className={WRAPPED_LINE_CLASS}>
      {line.tokens.map((token, tokenIndex) => {
        const tokenKey = `${key}-token-${tokenIndex}`;
        if (token.kind === 'chord') {
          return (
            <span
              key={tokenKey}
              className={composeClassName('font-semibold', CHORD_CLASS_BY_TONE[tone])}
            >
              [{token.chord}]
            </span>
          );
        }
        return (
          <span key={tokenKey} className={LYRIC_CLASS_BY_TONE[tone]}>
            {token.text}
          </span>
        );
      })}
    </div>
  );
}

// @FollowsBlueprint organism-presentational
export function ChordChartViewer({
  source,
  semitones = 0,
  compact = false,
  tone = 'light',
}: ChordChartViewerProps): JSX.Element {
  const lines = useMemo(() => parseChordPro(source), [source]);
  const transposed = useMemo(() => transposeLines(lines, semitones), [lines, semitones]);
  const sections = useMemo(() => groupChordProSections(transposed), [transposed]);
  return (
    <div
      className={composeClassName(
        'font-mono rounded-md',
        LYRIC_CLASS_BY_TONE[tone],
        SIZE_CLASS_BY_DENSITY[compact ? 'compact' : 'roomy'],
      )}
    >
      {sections.map((section, sectionIndex) => {
        const sectionKey = `chord-section-${sectionIndex}`;
        const hasHeading = hasSectionHeading(section);
        return (
          <section key={sectionKey} className="mb-5 last:mb-0">
            {hasHeading && (
              <div className="mb-1.5">
                <ChordProSectionHeading
                  kind={section.kind}
                  label={section.label}
                  ordinalAmongKind={section.ordinalAmongKind}
                  tone={tone}
                />
              </div>
            )}
            {section.lines.map((line, lineIndex) =>
              renderLine(line, `${sectionKey}-${lineIndex}`, tone),
            )}
          </section>
        );
      })}
    </div>
  );
}
