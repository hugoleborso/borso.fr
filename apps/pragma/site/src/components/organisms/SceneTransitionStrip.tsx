/** @Feature setlists */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openDialogOnAttach } from '../../lib/modal-dialog.adapter';
import type { SceneTransition } from '../../routes/setlists/scene-transition.core';
import { IconButton } from '../atoms/IconButton';
import { SceneTransitionPreview } from './SceneTransitionPreview';

export interface SceneTransitionStripProps {
  readonly nextTitle: string;
  readonly nextTonality: string | null;
  readonly transition: SceneTransition;
  readonly note: string;
}

// @FollowsBlueprint organism-presentational
export function SceneTransitionStrip(props: SceneTransitionStripProps): JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const close = (): void => setIsOpen(false);
  return (
    <>
      <SceneTransitionPreview layout="strip" onOpen={() => setIsOpen(true)} {...props} />
      {isOpen ? (
        // eslint-disable-next-line borso/no-raw-interactive-element -- a popup nested in the scene's own modal dialog: a portalled Sheet lands under the scene's top layer and is never seen
        <dialog
          ref={openDialogOnAttach}
          onClose={close}
          aria-label={t('scene.transitionCard', { title: props.nextTitle })}
          className="scheme-dark m-0 mx-auto mt-auto w-full max-w-[34rem] border-0 bg-transparent p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex flex-col gap-2 rounded-t-sheet bg-stage-bg p-3 lg:mb-6 lg:rounded-sheet">
            <form method="dialog" className="self-end">
              <IconButton
                type="submit"
                variant="stage"
                size="sm"
                icon="close"
                label={t('common.close')}
                data-sheet-close
              />
            </form>
            <SceneTransitionPreview layout="card" {...props} />
          </div>
        </dialog>
      ) : null}
    </>
  );
}
