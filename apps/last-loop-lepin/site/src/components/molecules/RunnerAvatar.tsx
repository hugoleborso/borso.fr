import * as Sentry from '@sentry/react';
import { useState } from 'react';
import { buildRunnerAvatar, type RunnerAvatarSurface } from '../../lib/runner-avatar.utils';
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

const SENTRY_BREADCRUMB_CATEGORY = 'runner_photo';
const SENTRY_BREADCRUMB_MESSAGE = 'runner_photo_load_failed';

/**
 * Avatar surface used by the leaderboard, the map, the elevation profile, and
 * the self punch dialog. It renders the runner's photo when there is one and
 * swaps to the initials placeholder when the image fails to load, which is a
 * DOM event and so needs one piece of state and no effect.
 */
export function RunnerAvatar({ runner, size, surface }: RunnerAvatarProps) {
  const avatar = buildRunnerAvatar(runner);
  const [hasPhotoFailed, setPhotoFailed] = useState(false);
  const view = selectRunnerAvatarView(avatar, hasPhotoFailed);
  const boxStyle = { width: `${size}px`, height: `${size}px` };

  const PHOTO_BY_VIEW = {
    photo: (
      <img
        className="runner-avatar runner-avatar--photo"
        src={view.photoUrl}
        alt={runner.displayName}
        data-runner-slug={runner.slug}
        data-surface={surface}
        style={boxStyle}
        onError={() => {
          Sentry.addBreadcrumb({
            category: SENTRY_BREADCRUMB_CATEGORY,
            message: SENTRY_BREADCRUMB_MESSAGE,
            data: { runnerSlug: runner.slug, surface },
          });
          setPhotoFailed(true);
        }}
      />
    ),
    initials: (
      <InitialsAvatar
        initials={view.initials}
        backgroundColor={view.backgroundColor}
        className="runner-avatar runner-avatar--initials"
        style={boxStyle}
        runnerSlug={runner.slug}
        surface={surface}
      />
    ),
  };

  return PHOTO_BY_VIEW[view.kind];
}
