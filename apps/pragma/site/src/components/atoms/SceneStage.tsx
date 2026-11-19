/** @Feature songs */

import { type JSX, type KeyboardEvent, type ReactNode, useCallback, useRef } from 'react';
import { UNSAFE_PortalProvider } from 'react-aria';
import { openSceneOnAttach } from '../../lib/scene-dialog.adapter';

export interface SceneStageProps {
  readonly label: string;
  readonly onClose: () => void;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  readonly children: ReactNode;
}

const STAGE_CLASS =
  'fixed inset-0 z-50 m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-stage-bg ' +
  'text-stage-ink overflow-hidden p-0 flex flex-col';

// @FollowsBlueprint atom-plain
export function SceneStage({ label, onClose, onKeyDown, children }: SceneStageProps): JSX.Element {
  const stage = useRef<HTMLDialogElement | null>(null);
  const attachStage = useCallback((dialog: HTMLDialogElement | null) => {
    stage.current = dialog;
    openSceneOnAttach(dialog);
  }, []);
  const getOverlayContainer = useCallback(() => stage.current, []);
  return (
    // eslint-disable-next-line borso/no-raw-interactive-element -- the scene view is a full-screen stage, not a sheet: no grabber, no title bar, its own dark tokens and its own transport, opened through openSceneOnAttach
    <dialog
      ref={attachStage}
      onClose={onClose}
      onKeyDown={onKeyDown}
      aria-label={label}
      className={STAGE_CLASS}
    >
      <UNSAFE_PortalProvider getContainer={getOverlayContainer}>{children}</UNSAFE_PortalProvider>
    </dialog>
  );
}
