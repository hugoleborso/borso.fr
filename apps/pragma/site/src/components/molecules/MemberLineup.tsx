/**
 * MemberLineup — row of bare MemberChips (no name labels) shown on
 * a SongCard's footer. Maps a lineup record (memberId → instrumentId
 * mapping) to a set of chips, using the resolved member's name and
 * colour. Caller injects the members + instruments to keep this
 * molecule free of data-fetching concerns.
 */

import { MemberChip } from './MemberChip';

export interface LineupMember {
  id: string;
  name: string;
  color: string;
}

export interface LineupInstrument {
  id: string;
  name: string;
}

export interface MemberLineupProps {
  lineup: Record<string, string>;
  members: readonly LineupMember[];
  instruments: readonly LineupInstrument[];
}

export function MemberLineup({
  lineup,
  members,
  instruments,
}: MemberLineupProps): JSX.Element {
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {Object.entries(lineup).map(([memberId, instrumentId]) => {
        const member = members.find((candidate) => candidate.id === memberId);
        if (!member) return null;
        const instrument = instruments.find((candidate) => candidate.id === instrumentId);
        const title = instrument ? `${member.name} — ${instrument.name}` : member.name;
        return (
          <MemberChip
            key={memberId}
            memberName={member.name}
            memberColor={member.color}
            title={title}
          />
        );
      })}
    </span>
  );
}
