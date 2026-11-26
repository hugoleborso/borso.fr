/** @Feature sessions */

import { z } from 'zod';

const friendsCountShape = z.record(z.guid(), z.number());

const NO_SHARE_PERCENT = 0;
const WHOLE_AS_PERCENT = 100;
const UNKNOWN_CAPACITY = 0;
const NO_FRIEND = 0;

// @FollowsBlueprint core-parse-untrusted
export function parseFriendsCounts(raw: unknown): Record<string, number> {
  const friendsCount = friendsCountShape.safeParse(raw);
  if (!friendsCount.success) return {};
  return friendsCount.data;
}

export function computeSharePercent(part: number, whole: number): number {
  if (whole === 0) return NO_SHARE_PERCENT;
  return (part / whole) * WHOLE_AS_PERCENT;
}

export function isCapacityKnown(capacity: number | null): capacity is number {
  return (capacity ?? UNKNOWN_CAPACITY) > UNKNOWN_CAPACITY;
}

export interface FriendsRegistration {
  readonly comingFor: { readonly id: string } | null;
}

export interface FriendsMember {
  readonly id: string;
}

export interface MemberFriendsRow<TMember extends FriendsMember> {
  readonly member: TMember;
  readonly registered: number;
  readonly expected: number;
  readonly registeredPercent: number;
  readonly expectedPercent: number;
}

export interface FriendsTally<TMember extends FriendsMember> {
  readonly rows: readonly MemberFriendsRow<TMember>[];
  readonly noPreferenceCount: number;
  readonly noPreferencePercent: number;
  readonly registeredTotal: number;
  readonly expectedTotal: number;
}

export interface FriendsTallyInput<TMember extends FriendsMember> {
  readonly members: readonly TMember[];
  readonly expectedCounts: Readonly<Record<string, number>>;
  readonly registrations: readonly FriendsRegistration[];
}

function sumOf(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, NO_FRIEND);
}

function countComingFor(memberId: string, registrations: readonly FriendsRegistration[]): number {
  return registrations.filter((registration) => registration.comingFor?.id === memberId).length;
}

// @FollowsBlueprint core-projection
export function tallyFriends<TMember extends FriendsMember>(
  input: FriendsTallyInput<TMember>,
): FriendsTally<TMember> {
  const counts = input.members.map((member) => ({
    member,
    registered: countComingFor(member.id, input.registrations),
    expected: input.expectedCounts[member.id] ?? NO_FRIEND,
  }));
  const noPreferenceCount =
    input.registrations.length - sumOf(counts.map((count) => count.registered));
  const scaleMax = Math.max(
    noPreferenceCount,
    ...counts.flatMap((count) => [count.registered, count.expected]),
  );
  return {
    rows: counts.map((count) => ({
      ...count,
      registeredPercent: computeSharePercent(count.registered, scaleMax),
      expectedPercent: computeSharePercent(count.expected, scaleMax),
    })),
    noPreferenceCount,
    noPreferencePercent: computeSharePercent(noPreferenceCount, scaleMax),
    registeredTotal: input.registrations.length,
    expectedTotal: sumOf(Object.values(input.expectedCounts)),
  };
}
