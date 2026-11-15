/** @Feature songs */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../atoms/IconButton';

export interface SongPreviewButtonProps {
  readonly previewUrl: string;
  readonly className?: string;
}

type PreviewPlayback = 'paused' | 'playing';

const CONTROL_BY_PLAYBACK = {
  paused: { icon: 'play', labelKey: 'catalog.playPreview' },
  playing: { icon: 'pause', labelKey: 'catalog.pausePreview' },
} as const satisfies Readonly<Record<PreviewPlayback, { icon: string; labelKey: string }>>;

const PRESS_BY_PLAYBACK = {
  paused: (player: HTMLAudioElement, onRefused: () => void) => {
    player.play().catch(onRefused);
  },
  playing: (player: HTMLAudioElement) => {
    player.pause();
  },
} as const satisfies Readonly<
  Record<PreviewPlayback, (player: HTMLAudioElement, onRefused: () => void) => void>
>;

// @FollowsBlueprint molecule-local-state
export function SongPreviewButton({ previewUrl, className }: SongPreviewButtonProps): JSX.Element {
  const { t } = useTranslation();
  const [player, setPlayer] = useState<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = useState<PreviewPlayback>('paused');
  const control = CONTROL_BY_PLAYBACK[playback];
  const showPaused = (): void => setPlayback('paused');

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- a 30-second excerpt of a published recording has no transcript to caption */}
      <audio
        ref={setPlayer}
        src={previewUrl}
        preload="none"
        onPlay={() => setPlayback('playing')}
        onPause={showPaused}
        onEnded={showPaused}
        onError={showPaused}
      />
      <IconButton
        variant="primary"
        size="sm"
        icon={control.icon}
        label={t(control.labelKey)}
        className={className}
        onClick={() => {
          if (player !== null) PRESS_BY_PLAYBACK[playback](player, showPaused);
        }}
      />
    </>
  );
}
