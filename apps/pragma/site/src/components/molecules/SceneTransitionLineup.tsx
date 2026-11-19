/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  describeSceneTransitionLineup,
  type SceneTransitionMember,
  type SceneTransitionPart,
} from '../../routes/setlists/scene-transition.core';
import { Avatar } from '../atoms/Avatar';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { memberInitial } from '../atoms/member-palette.utils';
import { INSTRUMENT_ICON_GLYPH } from './lineup-slots.core';

export interface SceneTransitionLineupProps {
  readonly members: readonly SceneTransitionMember[];
}

function Glyphs({
  parts,
  className,
}: {
  readonly parts: readonly SceneTransitionPart[];
  readonly className?: string;
}): JSX.Element {
  return (
    <>
      {parts.map((part) => (
        <Icon
          key={part.instrumentId}
          name={INSTRUMENT_ICON_GLYPH[part.icon]}
          size="md"
          className={composeClassName('shrink-0', className)}
        />
      ))}
    </>
  );
}

// @FollowsBlueprint molecule-presentational
export function SceneTransitionLineup({ members }: SceneTransitionLineupProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1.5 p-0">
      {members.map((member) => (
        <li key={member.memberId} data-transition-move={member.move}>
          <span
            role="img"
            aria-label={t('scene.transitionMember', {
              name: member.firstName,
              lineup: describeSceneTransitionLineup(member),
            })}
            className="inline-flex items-center gap-1 text-stage-ink"
          >
            <Avatar initials={memberInitial(member.firstName)} color={member.color} aria-hidden />
            <Glyphs parts={member.kept} />
            {member.hasArrow ? (
              <>
                <Glyphs parts={member.putDown} className="text-stage-ink-dim" />
                <Icon name="arrowR" size="sm" className="shrink-0 text-stage-ink-dim" />
                <Glyphs parts={member.pickUp} />
              </>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
