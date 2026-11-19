/** @Feature setlists */

import type { JSX } from 'react';
import {
  describeSceneTransitionMember,
  type SceneTransitionMember,
  type SceneTransitionPart,
} from '../../routes/setlists/scene-transition.core';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';
import { memberInitial } from '../atoms/member-palette.utils';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';

export interface SceneTransitionLineupProps {
  readonly members: readonly SceneTransitionMember[];
}

function Glyphs({ parts }: { readonly parts: readonly SceneTransitionPart[] }): JSX.Element {
  return (
    <>
      {parts.map((part) => (
        <Icon key={part.instrumentId} name={INSTRUMENT_ICON_GLYPH[part.icon]} size="md" />
      ))}
    </>
  );
}

// @FollowsBlueprint molecule-presentational
export function SceneTransitionLineup({ members }: SceneTransitionLineupProps): JSX.Element {
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1.5 p-0">
      {members.map((member) => (
        <li
          key={member.memberId}
          role="img"
          aria-label={describeSceneTransitionMember(member)}
          data-transition-move={member.move}
          className="inline-flex items-center gap-1 text-stage-ink"
        >
          <Avatar initials={memberInitial(member.firstName)} color={member.color} aria-hidden />
          <Glyphs parts={member.putDown} />
          {member.hasArrow ? <Icon name="arrowR" size="sm" className="text-stage-ink-dim" /> : null}
          <Glyphs parts={member.pickUp} />
        </li>
      ))}
    </ul>
  );
}
