export interface PlayedInstrument {
  readonly name: string;
  readonly players: readonly { readonly memberId: string; readonly isPrimary: boolean }[];
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
  readonly main?: readonly string[];
}

// @FollowsBlueprint core-projection
export function projectMemberForTool(
  member: MemberContact,
  instruments: readonly PlayedInstrument[],
): MemberToolView {
  const held = instruments.flatMap((instrument) =>
    instrument.players
      .filter((player) => player.memberId === member.id)
      .map((player) => ({ name: instrument.name, isPrimary: player.isPrimary })),
  );
  const view = {
    id: member.id,
    firstName: member.firstName,
    phone: member.phone,
    email: member.email,
    instruments: held.map((instrument) => instrument.name),
  };
  const main = held
    .filter((instrument) => instrument.isPrimary)
    .map((instrument) => instrument.name);
  return main.length > 0 ? { ...view, main } : view;
}
