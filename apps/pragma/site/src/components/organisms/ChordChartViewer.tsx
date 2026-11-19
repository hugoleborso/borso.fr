/** @Feature songs */

import { type JSX, useMemo } from 'react';
import {
  type ChordProSection,
  groupChordProSections,
  hasSectionHeading,
} from '../../lib/chordpro-sections.utils';
import {
  type ChordProLine,
  isTitleDirective,
  parseChordPro,
  widestTabLineLength,
} from '../../lib/chordpro.utils';
import { isCommentDirective } from '../../lib/chordpro-solo.utils';
import { buildChordCells, groupCellsIntoWords, hasLyricText } from '../../lib/chord-cells.utils';
import { buildTabFontSize } from '../../routes/catalog/scene-view.core';
import { transposeChordChart } from '../../routes/catalog/tab-transpose.core';
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
  light: 'text-ink',
  dark: 'text-stage-ink',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const TITLE_CLASS_BY_TONE = {
  light: 'text-ink',
  dark: 'text-stage-ink',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const DIRECTIVE_CLASS_BY_TONE = {
  light: 'text-ink-soft',
  dark: 'text-stage-ink-dim',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const SOLO_NOTE_CLASS_BY_TONE = {
  light: 'text-ink',
  dark: 'text-stage-ink',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const SOLO_FRAME_CLASS_BY_TONE = {
  light: 'border-l-4 border-accent bg-accent-soft rounded-md px-3 py-2',
  dark: 'border-l-4 border-stage-chord bg-stage-hover rounded-md px-3 py-2',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const SOLO_SECTION_KIND = 'solo';

const CHORD_CLASS_BY_TONE = {
  light: 'text-accent',
  dark: 'text-stage-chord',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const SIZE_CLASS_BY_DENSITY = {
  compact: 'text-meta leading-[1.7]',
  roomy: 'leading-[1.6]',
} as const;

const WRAPPED_LINE_CLASS = 'whitespace-pre-wrap break-words pl-6 -indent-6';

const CHORDS_ABOVE_LYRICS_LINE_CLASS = 'pl-6 -indent-6';

const CHORD_ABOVE_CLASS_BY_TONE = {
  light: 'before:text-accent',
  dark: 'before:text-stage-chord',
} as const satisfies Readonly<Record<ChordChartTone, string>>;

const CHORD_CELL_CLASS =
  'relative inline-block indent-0 whitespace-pre pt-[1lh] before:absolute before:top-0 before:left-0 before:font-semibold before:content-[attr(data-chord)]';

const CHORD_GAP_CHARACTERS = 1;

function chordCellMinimumWidth(chord: string | null): string | undefined {
  if (chord === null) return undefined;
  return `${chord.length + CHORD_GAP_CHARACTERS}ch`;
}

function renderLine(line: ChordProLine, key: string, tone: ChordChartTone): JSX.Element {
  if (line.kind === 'blank') return <div key={key} className="h-4" />;
  if (line.kind === 'directive' && isTitleDirective(line.name)) {
    return (
      <h3
        key={key}
        className={composeClassName(
          'font-display text-title m-0 mb-2 not-prose',
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
        className={composeClassName('italic text-meta m-0', DIRECTIVE_CLASS_BY_TONE[tone])}
      >
        {line.value}
      </p>
    );
  }
  if (line.kind === 'tab-line') {
    return (
      <div key={key} className={composeClassName('whitespace-pre', LYRIC_CLASS_BY_TONE[tone])}>
        {line.text}
      </div>
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
  const cells = buildChordCells(line.tokens);
  const chordClass = composeClassName('font-semibold', CHORD_CLASS_BY_TONE[tone]);
  if (!hasLyricText(line.tokens)) {
    return (
      <div key={key} className={WRAPPED_LINE_CLASS}>
        {cells.map((cell, cellIndex) => (
          <span key={`${key}-cell-${cellIndex}`} className={chordClass}>
            {`${cell.chord ?? ''} ${cell.lyric}`}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div key={key} className={CHORDS_ABOVE_LYRICS_LINE_CLASS}>
      {groupCellsIntoWords(cells).map((word, wordIndex) => (
        <span key={`${key}-word-${wordIndex}`} className="whitespace-nowrap">
          {word.map((cell, cellIndex) => (
            <span
              key={`${key}-word-${wordIndex}-cell-${cellIndex}`}
              data-chord={cell.chord ?? undefined}
              className={composeClassName(
                CHORD_CELL_CLASS,
                CHORD_ABOVE_CLASS_BY_TONE[tone],
                LYRIC_CLASS_BY_TONE[tone],
              )}
              style={{ minWidth: chordCellMinimumWidth(cell.chord) }}
            >
              {cell.lyric}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

function renderSoloNote(value: string, key: string, tone: ChordChartTone): JSX.Element {
  return (
    <p
      key={key}
      className={composeClassName(
        'font-sans text-meta font-medium m-0 mb-1 whitespace-pre-wrap',
        SOLO_NOTE_CLASS_BY_TONE[tone],
      )}
    >
      {value}
    </p>
  );
}

function renderSectionLine(
  section: ChordProSection,
  line: ChordProLine,
  key: string,
  tone: ChordChartTone,
): JSX.Element {
  if (
    section.kind === SOLO_SECTION_KIND &&
    line.kind === 'directive' &&
    isCommentDirective(line.name)
  ) {
    return renderSoloNote(line.value, key, tone);
  }
  return renderLine(line, key, tone);
}

function renderSectionLines(
  section: ChordProSection,
  sectionKey: string,
  tone: ChordChartTone,
): JSX.Element | readonly JSX.Element[] {
  const lines = section.lines.map((line, lineIndex) =>
    renderSectionLine(section, line, `${sectionKey}-${lineIndex}`, tone),
  );
  if (section.kind !== 'tab') return lines;
  return (
    <div className="@container overflow-x-auto" data-scrolls-sideways>
      <div style={{ fontSize: buildTabFontSize(widestTabLineLength(section.lines)) }}>{lines}</div>
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
  const transposed = useMemo(() => transposeChordChart(lines, semitones), [lines, semitones]);
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
          <section
            key={sectionKey}
            className={composeClassName(
              'mb-5 last:mb-0',
              section.kind === SOLO_SECTION_KIND ? SOLO_FRAME_CLASS_BY_TONE[tone] : undefined,
            )}
          >
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
            {renderSectionLines(section, sectionKey, tone)}
          </section>
        );
      })}
    </div>
  );
}
