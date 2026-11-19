/** @Feature setlists */

import type { JSX, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { SceneTransition } from '../../routes/setlists/scene-transition.core';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { SceneTransitionLineup } from '../molecules/SceneTransitionLineup';

export type SceneTransitionLayout = 'strip' | 'card';

export interface SceneTransitionPreviewProps {
  readonly layout: SceneTransitionLayout;
  readonly nextTitle: string;
  readonly nextTonality: string | null;
  readonly transition: SceneTransition;
  readonly note: string;
  readonly onReveal?: () => void;
  readonly cardRef?: Ref<HTMLElement>;
}

const NOTE_CLASS_BY_LAYOUT = {
  strip: 'truncate text-meta',
  card: 'whitespace-pre-wrap text-body',
} as const satisfies Readonly<Record<SceneTransitionLayout, string>>;

const TITLE_CLASS_BY_LAYOUT = {
  strip: 'text-meta font-medium',
  card: 'font-display text-title',
} as const satisfies Readonly<Record<SceneTransitionLayout, string>>;

function PreviewBody({
  layout,
  nextTitle,
  nextTonality,
  transition,
  note,
}: Omit<SceneTransitionPreviewProps, 'onReveal' | 'cardRef'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <Icon name="arrowR" className="shrink-0 text-stage-ink-dim" />
        <span className="shrink-0 text-label tracking-[0.18em] uppercase text-stage-ink-dim">
          {t('scene.transitionThen')}
        </span>
        <span className={composeClassName('min-w-0 truncate', TITLE_CLASS_BY_LAYOUT[layout])}>
          {nextTitle}
        </span>
        {nextTonality === null ? null : (
          <span className="shrink-0 font-mono text-meta text-stage-ink-dim">{nextTonality}</span>
        )}
      </span>
      {transition.isRisky ? (
        <span className="flex items-center gap-1.5 text-warn" data-transition-risky>
          <Icon name="warn" />
          <span className="text-label font-semibold tracking-wider uppercase">
            {t('setlist.transitionRisky')}
          </span>
        </span>
      ) : null}
      <SceneTransitionLineup members={transition.members} />
      {note === '' ? null : (
        <span
          className={composeClassName(
            'block font-display italic text-stage-ink',
            NOTE_CLASS_BY_LAYOUT[layout],
          )}
        >
          {note}
        </span>
      )}
    </>
  );
}

// @FollowsBlueprint organism-presentational
export function SceneTransitionPreview(props: SceneTransitionPreviewProps): JSX.Element {
  const { t } = useTranslation();
  const { layout, onReveal, cardRef, ...body } = props;
  if (layout === 'strip') {
    return (
      // eslint-disable-next-line borso/no-raw-interactive-element -- a full-width stage strip in the scene's own dark tokens, not one of the app's Button variants
      <button
        type="button"
        onClick={onReveal}
        aria-label={t('scene.transitionOpen', { title: body.nextTitle })}
        className="scheme-dark shrink-0 flex w-full flex-col gap-1.5 border-0 border-t border-stage-line bg-stage-hover px-4 py-2.5 text-left text-stage-ink sm:px-8"
      >
        <PreviewBody layout={layout} {...body} />
      </button>
    );
  }
  return (
    <section
      ref={cardRef}
      aria-label={t('scene.transitionCard', { title: body.nextTitle })}
      className="scheme-dark mt-8 flex flex-col gap-3 rounded-md border border-stage-line p-4 font-sans text-stage-ink"
    >
      <PreviewBody layout={layout} {...body} />
    </section>
  );
}
