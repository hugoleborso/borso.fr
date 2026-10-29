import type { Lineup } from '@domain/lineup.core';
import {
  matchReference,
  type ReferenceCandidate,
  type ReferenceMatch,
} from '../helpers/reference/reference.core';

export interface NamedEntity {
  readonly id: string;
  readonly name: string;
}

export interface LineupNames {
  readonly members: readonly NamedEntity[];
  readonly instruments: readonly NamedEntity[];
}

export type NamedLineupInput = Readonly<Record<string, string | readonly string[] | null>>;

export type UnresolvedMatch = Exclude<ReferenceMatch, { kind: 'found' }>;

export type LineupResolution =
  | { readonly kind: 'resolved'; readonly lineup: Record<string, string[]> }
  | {
      readonly kind: 'unresolved';
      readonly noun: 'member' | 'instrument';
      readonly reference: string;
      readonly match: UnresolvedMatch;
    };

const NAME_SEPARATOR = ', ';

export function listNameCandidates(entities: readonly NamedEntity[]): ReferenceCandidate[] {
  return entities.map((entity) => ({ id: entity.id, label: entity.name }));
}

export function nameEntity(entities: readonly NamedEntity[], id: string): string {
  return entities.find((entity) => entity.id === id)?.name ?? id;
}

// @FollowsBlueprint core-projection
export function nameLineup(lineup: Lineup, names: LineupNames): Record<string, string> {
  const named: Record<string, string> = {};
  for (const [memberId, instrumentIds] of Object.entries(lineup)) {
    const instrumentNames = instrumentIds.flatMap((id) => {
      const instrument = names.instruments.find((candidate) => candidate.id === id);
      return instrument === undefined ? [] : [instrument.name];
    });
    if (instrumentNames.length > 0) {
      named[nameEntity(names.members, memberId)] = instrumentNames.join(NAME_SEPARATOR);
    }
  }
  return named;
}

function listReferences(value: string | readonly string[] | null): readonly string[] {
  if (value === null) return [];
  return typeof value === 'string' ? [value] : value;
}

// @FollowsBlueprint core-decision
export function resolveNamedLineup(input: NamedLineupInput, names: LineupNames): LineupResolution {
  const members = listNameCandidates(names.members);
  const instruments = listNameCandidates(names.instruments);
  const lineup: Record<string, string[]> = {};
  for (const [memberReference, value] of Object.entries(input)) {
    const member = matchReference(members, memberReference);
    if (member.kind !== 'found') {
      return { kind: 'unresolved', noun: 'member', reference: memberReference, match: member };
    }
    const instrumentIds: string[] = [];
    for (const instrumentReference of listReferences(value)) {
      const instrument = matchReference(instruments, instrumentReference);
      if (instrument.kind !== 'found') {
        return {
          kind: 'unresolved',
          noun: 'instrument',
          reference: instrumentReference,
          match: instrument,
        };
      }
      instrumentIds.push(instrument.id);
    }
    lineup[member.id] = instrumentIds;
  }
  return { kind: 'resolved', lineup };
}
