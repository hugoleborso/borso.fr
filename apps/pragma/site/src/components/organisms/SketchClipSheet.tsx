/** @Feature sketches */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayedPassage } from '../../routes/compos/sketch-timeline.core';
import { Button } from '../atoms/Button';
import { Sheet } from '../molecules/Sheet';
import { YoutubePassagePlayer } from './YoutubePassagePlayer';

export interface SketchClipSheetProps {
  readonly passage: PlayedPassage;
  readonly onRemove: () => void;
  readonly onClose: () => void;
}

function ignorePlayerControl(): void {
  return undefined;
}

// @FollowsBlueprint organism-presentational
export function SketchClipSheet({ passage, onRemove, onClose }: SketchClipSheetProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Sheet
      title={passage.title}
      label={passage.title}
      isTitleARecordName
      onClose={onClose}
      footer={
        <Button icon="trash" variant="quiet" size="md" onClick={onRemove}>
          {t('sketch.removeClip')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 font-mono text-meta text-ink-soft">{passage.detail}</p>
        <YoutubePassagePlayer
          title={passage.title}
          videoId={passage.youtubeVideoId}
          startSeconds={passage.startSeconds}
          endSeconds={passage.endSeconds}
          isAutoplayed
          onControl={ignorePlayerControl}
        />
        {passage.note.length === 0 ? null : (
          <p className="m-0 text-meta whitespace-pre-wrap text-ink">{passage.note}</p>
        )}
      </div>
    </Sheet>
  );
}
