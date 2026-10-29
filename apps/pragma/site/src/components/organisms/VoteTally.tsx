/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SongTally } from '../../lib/queries/voting.utils';
import { Avatar } from '../atoms/Avatar';
import { MEMBER_LOADING_COLOR, memberInitial } from '../atoms/member-palette.utils';
import { PointsBadge } from '../atoms/PointsBadge';

export interface TallyMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface TallySong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
}

export interface VoteTallyProps {
  readonly tallies: readonly SongTally[];
  readonly songsById: ReadonlyMap<string, TallySong>;
  readonly membersById: ReadonlyMap<string, TallyMember>;
}

const UNKNOWN_MEMBER_COLOR = MEMBER_LOADING_COLOR;

// @FollowsBlueprint organism-presentational
export function VoteTally({ tallies, songsById, membersById }: VoteTallyProps): JSX.Element {
  const { t } = useTranslation();
  if (tallies.length === 0) {
    return <p className="text-meta text-ink-soft px-4">{t('voting.tallyEmpty')}</p>;
  }
  return (
    <ol className="list-none p-0 m-0 flex flex-col gap-2 px-4">
      {tallies.map((tally, rank) => (
        <li
          key={tally.songId}
          className="flex items-center gap-3 rounded-lg border border-rule bg-leaf px-3 py-2"
        >
          <span className="w-6 text-right tabular-nums text-ink-soft">{rank + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-ink m-0 truncate">
              {songsById.get(tally.songId)?.title ?? tally.songId}
            </p>
            <p className="text-meta text-ink-soft m-0 truncate">
              {songsById.get(tally.songId)?.artist ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {Object.entries(tally.pointsByMember).map(([memberId, points]) => (
              <span key={memberId} className="flex items-center gap-1">
                <Avatar
                  initials={memberInitial(membersById.get(memberId)?.firstName ?? '?')}
                  color={membersById.get(memberId)?.color ?? UNKNOWN_MEMBER_COLOR}
                  size="xs"
                />
                <span className="text-meta tabular-nums text-ink-soft">{points}</span>
              </span>
            ))}
          </div>
          <PointsBadge points={tally.points} />
        </li>
      ))}
    </ol>
  );
}
