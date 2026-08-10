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
 */

import { useMemo } from 'react';
import { isTitleDirective, parseChordPro, transposeLines } from '../../lib/chordpro.utils';
import { composeClassName } from '../atoms/class-name.utils';

interface ChordChartViewerProps {
  readonly source: string;
  readonly semitones?: number;
  readonly compact?: boolean;
}

// @FollowsBlueprint organism-presentational
export function ChordChartViewer({
  source,
  semitones = 0,
  compact = false,
}: ChordChartViewerProps): JSX.Element {
  const lines = useMemo(() => parseChordPro(source), [source]);
  const transposed = useMemo(() => transposeLines(lines, semitones), [lines, semitones]);
  const fontSize = compact ? 'text-[13px] leading-[1.7]' : 'text-[18px] leading-[2]';
  return (
    <div
      className={composeClassName(
        'font-mono text-ink-700 whitespace-pre rounded-md overflow-x-auto',
        fontSize,
      )}
    >
      {transposed.map((line, index) => {
        const key = `chord-line-${index}`;
        if (line.kind === 'blank') return <div key={key} className="h-4" />;
        if (line.kind === 'directive' && isTitleDirective(line.name)) {
          return (
            <h3 key={key} className="font-display italic text-2xl text-ink-900 m-0 mb-2 not-prose">
              {line.value}
            </h3>
          );
        }
        if (line.kind === 'directive') {
          return (
            <p key={key} className="text-ink-500 italic text-xs m-0">
              {line.value}
            </p>
          );
        }
        if (line.kind === 'plain-line') {
          return (
            <p key={key} className="text-ink-700 m-0">
              {line.text}
            </p>
          );
        }
        return (
          <div key={key} className="whitespace-pre">
            {line.tokens.map((token, tokenIndex) => {
              const tokenKey = `${key}-token-${tokenIndex}`;
              if (token.kind === 'chord') {
                return (
                  <span key={tokenKey} className="text-accent font-semibold">
                    [{token.chord}]
                  </span>
                );
              }
              return (
                <span key={tokenKey} className="text-ink-700">
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
