/** @Feature songs */

import { transposeChord, transposeLines } from '../../lib/chordpro.utils';
import type { ChordProLine } from '../../lib/chordpro.utils';
import { isChordLine, isTabBlockStaffLine } from './chords-above-lyrics.core';

const FRET_PATTERN = /(?<![x\d])\d+/g;
const WORD_PATTERN = /\S+/g;
const TRAILING_FILLER_PATTERN = /-+$/;
const FILLER = '-';
const NOTES_IN_OCTAVE = 12;
const LOWEST_FRET = 0;
const WORD_GAP = 1;

interface FretSpan {
  readonly start: number;
  readonly end: number;
}

export interface FretCluster extends FretSpan {
  readonly width: number;
}

export interface TransposedTabSystem {
  readonly lines: readonly string[];
  readonly clusters: readonly FretCluster[];
}

type TabBlockGroup = { readonly staves: string[] } | { readonly line: string };

// @FollowsBlueprint utils-pure-module
export function transposeFret(fret: number, semitones: number): number {
  const shifted = fret + semitones;
  return shifted < LOWEST_FRET ? shifted + NOTES_IN_OCTAVE : shifted;
}

function readFretSpans(staffLine: string): readonly FretSpan[] {
  return [...staffLine.matchAll(FRET_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function mergeOverlappingSpans(spans: readonly FretSpan[]): readonly FretSpan[] {
  const merged: FretSpan[] = [];
  for (const span of spans.toSorted((left, right) => left.start - right.start)) {
    const previous = merged.at(-1);
    if (previous !== undefined && span.start < previous.end) {
      merged[merged.length - 1] = { start: previous.start, end: Math.max(previous.end, span.end) };
      continue;
    }
    merged.push(span);
  }
  return merged;
}

function rewriteSpan(staffLine: string, span: FretSpan, semitones: number): string {
  return staffLine
    .slice(span.start, span.end)
    .replace(FRET_PATTERN, (fret) => String(transposeFret(Number(fret), semitones)))
    .replace(TRAILING_FILLER_PATTERN, '');
}

function measureCluster(
  staffLines: readonly string[],
  span: FretSpan,
  semitones: number,
): FretCluster {
  const widths = staffLines.map((staffLine) => rewriteSpan(staffLine, span, semitones).length);
  return { ...span, width: Math.max(...widths) };
}

function stitchStaffLine(
  staffLine: string,
  clusters: readonly FretCluster[],
  semitones: number,
): string {
  let stitched = '';
  let consumed = 0;
  for (const cluster of clusters) {
    if (cluster.start >= staffLine.length) break;
    const rewrittenColumn = rewriteSpan(staffLine, cluster, semitones).padEnd(
      cluster.width,
      FILLER,
    );
    stitched += staffLine.slice(consumed, cluster.start) + rewrittenColumn;
    consumed = cluster.end;
  }
  return stitched + staffLine.slice(consumed);
}

export function transposeTabSystem(
  staffLines: readonly string[],
  semitones: number,
): TransposedTabSystem {
  const spans = mergeOverlappingSpans(staffLines.flatMap(readFretSpans));
  const clusters = spans.map((span) => measureCluster(staffLines, span, semitones));
  return {
    lines: staffLines.map((staffLine) => stitchStaffLine(staffLine, clusters, semitones)),
    clusters,
  };
}

function columnShift(systemBelow: TransposedTabSystem | null, column: number): number {
  if (systemBelow === null) return 0;
  let shift = 0;
  for (const cluster of systemBelow.clusters) {
    if (cluster.start < column) shift += cluster.width - (cluster.end - cluster.start);
  }
  return shift;
}

export function transposeTabChordLine(
  chordLine: string,
  semitones: number,
  systemBelow: TransposedTabSystem | null,
): string {
  let rebuilt = '';
  let firstFreeColumn = 0;
  for (const match of chordLine.matchAll(WORD_PATTERN)) {
    const wanted = match.index + columnShift(systemBelow, match.index);
    rebuilt =
      rebuilt.padEnd(Math.max(wanted, firstFreeColumn)) + transposeChord(match[0], semitones);
    firstFreeColumn = rebuilt.length + WORD_GAP;
  }
  return rebuilt;
}

function groupSystems(tabLines: readonly string[]): readonly TabBlockGroup[] {
  const groups: TabBlockGroup[] = [];
  for (const line of tabLines) {
    const previous = groups.at(-1);
    if (!isTabBlockStaffLine(line)) groups.push({ line });
    else if (previous !== undefined && 'staves' in previous) previous.staves.push(line);
    else groups.push({ staves: [line] });
  }
  return groups;
}

export function transposeTabLines(
  tabLines: readonly string[],
  semitones: number,
): readonly string[] {
  const transposed: (readonly string[])[] = [];
  let systemBelow: TransposedTabSystem | null = null;
  for (const group of groupSystems(tabLines).toReversed()) {
    if ('staves' in group) {
      systemBelow = transposeTabSystem(group.staves, semitones);
      transposed.unshift(systemBelow.lines);
      continue;
    }
    const line = isChordLine(group.line)
      ? transposeTabChordLine(group.line, semitones, systemBelow)
      : group.line;
    transposed.unshift([line]);
    systemBelow = null;
  }
  return transposed.flat();
}

export function transposeChordChart(
  lines: readonly ChordProLine[],
  semitones: number,
): readonly ChordProLine[] {
  const transposed: ChordProLine[] = [];
  let tabRun: string[] = [];
  const flushTabRun = (): void => {
    for (const text of transposeTabLines(tabRun, semitones)) {
      transposed.push({ kind: 'tab-line', text });
    }
    tabRun = [];
  };
  for (const line of transposeLines(lines, semitones)) {
    if (line.kind === 'tab-line') {
      tabRun.push(line.text);
      continue;
    }
    flushTabRun();
    transposed.push(line);
  }
  flushTabRun();
  return transposed;
}
