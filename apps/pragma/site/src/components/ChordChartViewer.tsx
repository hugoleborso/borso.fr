/**
 * ChordPro renderer. Pure-output wrapper around `parseChordPro` +
 * `transposeLines` — every layout decision is in CSS; this component
 * just emits the typed line tokens.
 *
 * The viewer is used in two surfaces:
 *  - inline preview on `/catalog/:songId` (compact, no controls);
 *  - Mode Scène (`/catalog/:songId/scene`) — fullscreen, transpose
 *    controls, large font, swipe-between-songs when in setlist mode.
 *
 * The transposition state lives in the parent (the Mode Scène page
 * owns the slider; the inline preview pins semitones to 0).
 */

import { useMemo } from 'react';
import { parseChordPro, transposeLines } from '../lib/chordpro.utils';

interface ChordChartViewerProps {
  readonly source: string;
  readonly semitones?: number;
  readonly compact?: boolean;
}

export function ChordChartViewer({
  source,
  semitones = 0,
  compact = false,
}: ChordChartViewerProps): JSX.Element {
  const lines = useMemo(() => parseChordPro(source), [source]);
  const transposed = useMemo(() => transposeLines(lines, semitones), [lines, semitones]);
  return (
    <div className={`chord-chart-viewer${compact ? ' chord-chart-viewer--compact' : ''}`}>
      {transposed.map((line, index) => {
        const key = `chord-line-${index}`;
        if (line.kind === 'blank') return <div key={key} className="chord-chart-blank" />;
        if (line.kind === 'directive') {
          if (line.name === 'title' || line.name === 't') {
            return (
              <h3 key={key} className="chord-chart-title">
                {line.value}
              </h3>
            );
          }
          return (
            <p key={key} className="chord-chart-directive">
              {line.value}
            </p>
          );
        }
        if (line.kind === 'plain-line') {
          return (
            <p key={key} className="chord-chart-plain">
              {line.text}
            </p>
          );
        }
        return (
          <div key={key} className="chord-chart-line">
            {line.tokens.map((token, tokenIndex) => {
              const tokenKey = `${key}-token-${tokenIndex}`;
              if (token.kind === 'chord') {
                return (
                  <span key={tokenKey} className="chord-chart-chord">
                    {token.chord}
                  </span>
                );
              }
              return (
                <span key={tokenKey} className="chord-chart-lyric">
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
