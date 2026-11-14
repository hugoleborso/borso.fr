/** @Feature inspirations */

import { buildYoutubeWatchUrl } from '@domain/inspiration.core';
import { type JSX, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { attachPassagePlayer, type PassagePlayerControl } from '../../lib/youtube-player.adapter';
import { ButtonAnchor } from '../atoms/ButtonAnchor';
import { Icon } from '../atoms/Icon';

export interface YoutubePassagePlayerProps {
  readonly title: string;
  readonly videoId: string;
  readonly startSeconds: number;
  readonly endSeconds: number | null;
  readonly isAutoplayed: boolean;
  readonly onControl: (control: PassagePlayerControl) => void;
}

// @FollowsBlueprint organism-imperative-bridge
export function YoutubePassagePlayer({
  title,
  videoId,
  startSeconds,
  endSeconds,
  isAutoplayed,
  onControl,
}: YoutubePassagePlayerProps): JSX.Element {
  const { t } = useTranslation();
  const [isBlocked, setIsBlocked] = useState(false);
  const attachPlayer = useCallback(
    (element: HTMLDivElement | null) =>
      attachPassagePlayer(
        element,
        { videoId, startSeconds, endSeconds, isAutoplayed },
        { onBlocked: () => setIsBlocked(true), onControl },
      ),
    [videoId, startSeconds, endSeconds, isAutoplayed, onControl],
  );

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        ref={attachPlayer}
        role="region"
        aria-label={t('inspirations.player.title', { title })}
        data-video-id={videoId}
        data-start-seconds={startSeconds}
        data-end-seconds={endSeconds ?? undefined}
        className="aspect-video w-full overflow-hidden rounded-md bg-ink"
      />
      {isBlocked ? (
        <ButtonAnchor
          href={buildYoutubeWatchUrl(videoId, startSeconds)}
          mark={<Icon name="external" />}
          size="sm"
        >
          {t('inspirations.player.openOnYoutube')}
        </ButtonAnchor>
      ) : null}
    </div>
  );
}
