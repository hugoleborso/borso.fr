/** @Feature songs */

import {
  type ImplicitSoloProgress,
  advanceImplicitSolo,
  IMPLICIT_SOLO_OPENED,
  isSoloComment,
  shouldEndImplicitSolo,
} from './chordpro-solo.utils';
import type { ChordProLine } from './chordpro.utils';
export type ChordProSectionKind = 'verse' | 'chorus' | 'bridge' | 'tab' | 'solo' | 'body';

export type LabelledSectionKind = Exclude<ChordProSectionKind, 'body'>;

export interface BodySection {
  readonly kind: 'body';
  readonly label: null;
  readonly ordinalAmongKind: null;
  readonly lines: readonly ChordProLine[];
}

export interface LabelledSection {
  readonly kind: LabelledSectionKind;
  readonly label: string | null;
  readonly ordinalAmongKind: number;
  readonly lines: readonly ChordProLine[];
}

export type ChordProSection = BodySection | LabelledSection;

const BODY_SECTION_KIND = 'body';
const FIRST_ORDINAL = 1;

export const SECTION_START_DIRECTIVES = new Map<string, ChordProSectionKind>([
  ['start_of_verse', 'verse'],
  ['sov', 'verse'],
  ['start_of_chorus', 'chorus'],
  ['soc', 'chorus'],
  ['start_of_bridge', 'bridge'],
  ['sob', 'bridge'],
  ['start_of_tab', 'tab'],
  ['sot', 'tab'],
  ['start_of_solo', 'solo'],
]);

export const SECTION_END_DIRECTIVES = new Set([
  'end_of_verse',
  'eov',
  'end_of_chorus',
  'eoc',
  'end_of_bridge',
  'eob',
  'end_of_tab',
  'eot',
  'end_of_solo',
]);

export const SOLO_SECTION_KIND = 'solo';

function hasRenderableLine(lines: readonly ChordProLine[]): boolean {
  return lines.some((line) => line.kind !== 'blank');
}

function trimTrailingBlanks(lines: ChordProLine[]): void {
  while (lines.at(-1)?.kind === 'blank') lines.pop();
}

interface AccumulatingSection {
  readonly kind: ChordProSectionKind;
  readonly label: string | null;
  readonly lines: ChordProLine[];
}

function openSection(kind: ChordProSectionKind, label: string | null): AccumulatingSection {
  return { kind, label, lines: [] };
}

const NO_SECTION_SEEN_YET = 0;

function rankByKind(sections: readonly AccumulatingSection[]): readonly ChordProSection[] {
  const seenPerKind = new Map<LabelledSectionKind, number>();
  return sections.map((section) => {
    const { kind, label, lines } = section;
    if (kind === BODY_SECTION_KIND) return { kind, label: null, ordinalAmongKind: null, lines };
    const ordinalAmongKind = (seenPerKind.get(kind) ?? NO_SECTION_SEEN_YET) + FIRST_ORDINAL;
    seenPerKind.set(kind, ordinalAmongKind);
    return { kind, label, ordinalAmongKind, lines };
  });
}

// @FollowsBlueprint utils-pure-module
export function groupChordProSections(lines: readonly ChordProLine[]): readonly ChordProSection[] {
  const closed: AccumulatingSection[] = [];
  let current = openSection(BODY_SECTION_KIND, null);
  let implicitSolo: ImplicitSoloProgress | null = null;
  const closeCurrent = (): void => {
    if (current.kind === SOLO_SECTION_KIND) trimTrailingBlanks(current.lines);
    if (current.kind !== BODY_SECTION_KIND || hasRenderableLine(current.lines)) {
      closed.push(current);
    }
    current = openSection(BODY_SECTION_KIND, null);
    implicitSolo = null;
  };
  for (const [index, line] of lines.entries()) {
    if (implicitSolo !== null && !shouldEndImplicitSolo(line, lines.slice(index), implicitSolo)) {
      implicitSolo = advanceImplicitSolo(implicitSolo, line);
      current.lines.push(line);
      continue;
    }
    if (implicitSolo !== null) closeCurrent();
    // Stryker disable next-line ConditionalExpression: equivalent mutant
    if (line.kind === 'directive') {
      const startedKind = SECTION_START_DIRECTIVES.get(line.name);
      if (startedKind !== undefined) {
        closeCurrent();
        current = openSection(startedKind, line.value.length > 0 ? line.value : null);
        continue;
      }
      if (SECTION_END_DIRECTIVES.has(line.name)) {
        closeCurrent();
        continue;
      }
      if (current.kind === BODY_SECTION_KIND && isSoloComment(line)) {
        closeCurrent();
        current = openSection(SOLO_SECTION_KIND, line.value);
        implicitSolo = IMPLICIT_SOLO_OPENED;
        continue;
      }
    }
    current.lines.push(line);
  }
  closeCurrent();
  return rankByKind(closed);
}

export function hasSectionHeading(section: ChordProSection): section is LabelledSection {
  return section.kind !== BODY_SECTION_KIND;
}

export function buildSectionHeading(displayName: string, ordinalAmongKind: number): string {
  if (ordinalAmongKind <= FIRST_ORDINAL) return displayName;
  return `${displayName} ${ordinalAmongKind}`;
}

const SHADE_EVERY = 2;

export function isShadedSection(sectionIndex: number): boolean {
  return sectionIndex % SHADE_EVERY === 1;
}
