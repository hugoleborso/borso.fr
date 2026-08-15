/**
 * ChordPro renderer. Pure-output wrapper around `parseChordPro` +
 * `transposeLines` — every layout decision is in Tailwind utility
 * classes on the rendered tokens.
 *
 * The viewer is used in two surfaces:
 *  - inline preview on `/catalog/:songId` (compact, no controls);
 *  - the stage view (`/catalog/:songId/scene`) — fullscreen, transpose
 *    controls, large font, swipe-between-songs when in setlist mode.
 *
 * The transposition state lives in the parent (the stage view page
 * owns the slider; the inline preview pins semitones to 0).
 *
 * Two things the phone forced, both of which the desktop never showed:
 *
 * `tone` picks the palette. The cream `ink` tones the viewer used to
 * hard-code sit at 1.6:1 on the stage view's black, which is the one screen
 * that is read while playing.
 *
 * Outside compact mode the viewer sets no font size at all, so the size it
 * renders at is the one it inherits — the stage view's A−/A+ zoom writes that
 * size on the `<dialog>` and a literal `text-[18px]` here used to swallow it.
 * Lines wrap rather than running off the right edge, because a chart you pan
 * sideways shows one line at a time and stops being a chart. A wrapped
 * continuation is indented so it reads as a continuation and not as a new line
 * of the song.
 */

import { useMemo } from 'react';
import { isTitleDirective, parseChordPro, transposeLines } from '../../lib/chordpro.utils';
import { composeClassName } from '../atoms/class-name.utils';

export type ChordChartTone = 'light' | 'dark';

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

// @FollowsBlueprint organism-presentational
export function ChordChartViewer({
  source,
  semitones = 0,
  compact = false,
  tone = 'light',
}: ChordChartViewerProps): JSX.Element {
  const lines = useMemo(() => parseChordPro(source), [source]);
  const transposed = useMemo(() => transposeLines(lines, semitones), [lines, semitones]);
  return (
    <div
      className={composeClassName(
        'font-mono rounded-md',
        LYRIC_CLASS_BY_TONE[tone],
        SIZE_CLASS_BY_DENSITY[compact ? 'compact' : 'roomy'],
      )}
    >
      {transposed.map((line, index) => {
        const key = `chord-line-${index}`;
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
      })}
    </div>
  );
}
