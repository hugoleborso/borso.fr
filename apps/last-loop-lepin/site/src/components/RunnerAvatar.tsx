/**
 * Avatar surface for runners across the 4 visual surfaces (leaderboard,
 * map, elevation profile, self-punch modal). Renders the runner's photo
 * when `photoUrl` is set and swaps to the initials placeholder on
 * `<img onError>` — that's a DOM event handler, not synchronisation with
 * an external system, so a single `useState<'photo' | 'fallback'>` covers
 * it without reaching for `useEffect` (CLAUDE.md "`useEffect` is a smell").
 */

import { useState } from 'react';
import * as Sentry from '@sentry/react';
import {
  type RunnerAvatarSurface,
  buildRunnerAvatar,
} from '../domain/runner-avatar.utils';

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

export function RunnerAvatar({ runner, size, surface }: RunnerAvatarProps) {
  const avatar = buildRunnerAvatar(runner);
  const [loadState, setLoadState] = useState<'photo' | 'fallback'>(
    avatar.kind === 'photo' ? 'photo' : 'fallback',
  );

  const cssSize: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  if (avatar.kind === 'photo' && loadState === 'photo') {
    return (
      <img
        className="runner-avatar runner-avatar--photo"
        src={avatar.url}
        alt={runner.displayName}
        data-runner-slug={runner.slug}
        data-surface={surface}
        style={cssSize}
        onError={() => {
          Sentry.addBreadcrumb({
            category: SENTRY_BREADCRUMB_CATEGORY,
            message: SENTRY_BREADCRUMB_MESSAGE,
            data: { runnerSlug: runner.slug, surface },
          });
          setLoadState('fallback');
        }}
      />
    );
  }

  const fallback = avatar.kind === 'photo' ? avatar.fallback : avatar;
  return (
    <span
      className="runner-avatar runner-avatar--initials"
      data-runner-slug={runner.slug}
      data-surface={surface}
      style={{ ...cssSize, background: fallback.backgroundColor }}
    >
      {fallback.initials}
    </span>
  );
}
