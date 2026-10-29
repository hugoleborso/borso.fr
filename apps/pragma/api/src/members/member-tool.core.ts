export interface PlayedInstrument {
  readonly name: string;
  readonly players: readonly { readonly memberId: string }[];
}

export interface MemberContact {
  readonly id: string;
  readonly firstName: string;
  readonly phone: string | null;
  readonly email: string | null;
}

export interface MemberToolView {
  readonly id: string;
  readonly firstName: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly instruments: readonly string[];
}

// @FollowsBlueprint core-projection
export function projectMemberForTool(
  member: MemberContact,
  instruments: readonly PlayedInstrument[],
): MemberToolView {
  return {
    id: member.id,
    firstName: member.firstName,
    phone: member.phone,
    email: member.email,
    instruments: instruments
      .filter((instrument) => instrument.players.some((player) => player.memberId === member.id))
      .map((instrument) => instrument.name),
  };
}
