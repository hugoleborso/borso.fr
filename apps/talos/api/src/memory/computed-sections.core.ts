import { addDaysToDate, formatParisDate } from '../helpers/calendar/paris-clock.utils';
import {
  type AttributeMap,
  type AttributeValue,
  composeFactRaw,
  type ComputedSection,
  type FactLine,
  FACTS_HEADING,
  HISTORY_HEADING,
  RELATIONS_HEADING,
} from './page-rendering.core';

export interface ContainmentRelation {
  readonly verb: string;
  readonly toSlug: string;
  readonly until: string | null;
  readonly position: number;
}

export interface ContainedEntity {
  readonly slug: string;
  readonly kind: string;
  readonly attributes: AttributeMap;
}

export interface ContainedFact extends FactLine {
  readonly entitySlug: string;
  readonly learnedOn: string | null;
}

export interface Containment {
  readonly containedSlugs: readonly string[];
  readonly containedEntities: readonly ContainedEntity[];
  readonly descendantFacts: readonly ContainedFact[];
  readonly windowStart: string;
}

export const CONTAINED_HEADING = 'Comprend';
export const RECENT_FACTS_HEADING = 'Faits récents';

const CONTAINMENT_VERB = 'comprend';
const PROJECT_KIND = 'projet';
const PROJECT_LINE_ATTRIBUTES = ['statut', 'meteo', 'prochaine_etape', 'echeance'] as const;
const SUMMARY_DAY_ATTRIBUTES = ['resume_le', 'maj'] as const;
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_WINDOW_DAYS = 30;
export const RECENT_FACT_LIMIT = 10;
const LINE_BREAK = '\n';
const LIST_ITEM_PREFIX = '- ';
export const HEADING_PREFIXES = ['# ', '## '] as const;
const COMPUTED_HEADING_LINES: ReadonlySet<string> = new Set(
  [FACTS_HEADING, HISTORY_HEADING, RELATIONS_HEADING, CONTAINED_HEADING, RECENT_FACTS_HEADING].map(
    (heading) => `## ${heading}`,
  ),
);

// @FollowsBlueprint core-decision
export function selectContainedSlugs(relations: readonly ContainmentRelation[]): string[] {
  const contained = relations
    .filter((relation) => relation.verb === CONTAINMENT_VERB && relation.until === null)
    .toSorted((left, right) => left.position - right.position)
    .map((relation) => relation.toSlug);
  return [...new Set(contained)];
}

export function selectDescendantSlugs(
  slug: string,
  containedSlugs: readonly string[],
  relationsOfContained: readonly ContainmentRelation[],
): string[] {
  const descendants = new Set([...containedSlugs, ...selectContainedSlugs(relationsOfContained)]);
  descendants.delete(slug);
  return [...descendants];
}

function isIsoDay(value: AttributeValue | null | undefined): value is string {
  return typeof value === 'string' && ISO_DAY_PATTERN.test(value);
}

export function selectSummaryDay(attributes: AttributeMap, updatedAt: Date | null): string | null {
  const writtenDay = SUMMARY_DAY_ATTRIBUTES.map((key) => attributes[key]).find(isIsoDay);
  if (writtenDay !== undefined) return writtenDay;
  return updatedAt === null ? null : formatParisDate(updatedAt);
}

export function selectRecentWindowStart(summaryDay: string | null, today: string): string {
  return summaryDay ?? addDaysToDate(today, -DEFAULT_WINDOW_DAYS);
}

function composeContainedLine(slug: string, entity: ContainedEntity | undefined): string {
  const link = `[[${slug}]]`;
  if (entity?.kind !== PROJECT_KIND) return link;
  const segments = PROJECT_LINE_ATTRIBUTES.flatMap((key) => {
    const value = entity.attributes[key];
    return typeof value === 'string' && value !== '' ? [` | ${key}: ${value}`] : [];
  });
  return `${link}${segments.join('')}`;
}

function isLearnedOnADay(fact: ContainedFact): fact is ContainedFact & { learnedOn: string } {
  return isIsoDay(fact.learnedOn);
}

function composeRecentFactLines(facts: readonly ContainedFact[], windowStart: string): string[] {
  return facts
    .filter(isLearnedOnADay)
    .filter((fact) => fact.learnedOn >= windowStart)
    .toSorted((left, right) => right.learnedOn.localeCompare(left.learnedOn))
    .slice(0, RECENT_FACT_LIMIT)
    .map(
      (fact) => `${fact.learnedOn} | [[${fact.entitySlug}]] | ${fact.raw ?? composeFactRaw(fact)}`,
    );
}

export function composeComputedSections(containment: Containment): ComputedSection[] {
  const entitiesBySlug = new Map(
    containment.containedEntities.map((entity) => [entity.slug, entity]),
  );
  return [
    {
      heading: CONTAINED_HEADING,
      lines: containment.containedSlugs.map((slug) =>
        composeContainedLine(slug, entitiesBySlug.get(slug)),
      ),
    },
    {
      heading: RECENT_FACTS_HEADING,
      lines: composeRecentFactLines(containment.descendantFacts, containment.windowStart),
    },
  ];
}

interface KeptLines {
  readonly lines: readonly string[];
  readonly isUnderComputedHeading: boolean;
}

export function dropComputedLines(body: string): string {
  const kept = body.split(LINE_BREAK).reduce<KeptLines>(
    (state, line) => {
      if (HEADING_PREFIXES.some((prefix) => line.startsWith(prefix))) {
        return {
          lines: [...state.lines, line],
          isUnderComputedHeading: COMPUTED_HEADING_LINES.has(line.trimEnd()),
        };
      }
      const isComputedLine = state.isUnderComputedHeading && line.startsWith(LIST_ITEM_PREFIX);
      return isComputedLine ? state : { ...state, lines: [...state.lines, line] };
    },
    { lines: [], isUnderComputedHeading: false },
  );
  return kept.lines.join(LINE_BREAK);
}
