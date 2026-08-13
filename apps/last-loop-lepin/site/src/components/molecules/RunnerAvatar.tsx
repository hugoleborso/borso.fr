import { useState } from 'react';
import {
  buildRunnerAvatar,
  RUNNER_AVATAR_INITIALS_CLASS,
  RUNNER_AVATAR_PHOTO_CLASS,
  type RunnerAvatarSurface,
} from '../../lib/runner-avatar.utils';
import { recordDiagnosticEvent } from '../../observability/sentry';
import { InitialsAvatar } from '../atoms/InitialsAvatar';
import { selectRunnerAvatarView } from './runner-avatar-view.utils';

interface RunnerAvatarProps {
  readonly runner: {
    readonly slug: string;
    readonly displayName: string;
    readonly photoUrl?: string | null;
  };
  readonly size: number;
  readonly surface: RunnerAvatarSurface;
}

/**
 * Avatar surface used by the leaderboard, the map, the elevation profile, and
 * the self punch dialog. It renders the runner's photo when there is one and
 * swaps to the initials placeholder when the image fails to load, which is a
 * DOM event and so needs one piece of state and no effect.
 */
/**
 * @Blueprint molecule-view-selector
 * @BlueprintName Molecule With A Selected View
 * @BlueprintUsage Use for a molecule that renders one of several shapes, where the choice depends on props plus one small piece of local state.
 * @BlueprintDescription Owns exactly one flag, `hasPhotoFailed`, written only from the image's `onError` handler, and hands it with the built avatar to `selectRunnerAvatarView`, a pure covered selector returning a union `kind`. That `kind` indexes `PHOTO_BY_VIEW`, so the component ends on a table lookup and carries no conditional. The selector returns both the photo URL and the initials, which is what lets the failure swap render without a second decision.
 */
export function RunnerAvatar({ runner, size, surface }: RunnerAvatarProps) {
  const avatar = buildRunnerAvatar(runner);
  const [hasPhotoFailed, setPhotoFailed] = useState(false);
  const view = selectRunnerAvatarView(avatar, hasPhotoFailed);
  const boxStyle = { width: `${size}px`, height: `${size}px` };

  const PHOTO_BY_VIEW = {
    photo: (
      <img
        className={RUNNER_AVATAR_PHOTO_CLASS}
        src={view.photoUrl}
        alt={runner.displayName}
        data-runner-slug={runner.slug}
        data-surface={surface}
        style={boxStyle}
        onError={() => {
          recordDiagnosticEvent('runner_photo', 'runner_photo_load_failed', {
            runnerSlug: runner.slug,
            surface,
          });
          setPhotoFailed(true);
        }}
      />
    ),
    initials: (
      <InitialsAvatar
        initials={view.initials}
        backgroundColor={view.backgroundColor}
        className={RUNNER_AVATAR_INITIALS_CLASS}
        style={boxStyle}
        runnerSlug={runner.slug}
        surface={surface}
      />
    ),
  };

  return PHOTO_BY_VIEW[view.kind];
}
