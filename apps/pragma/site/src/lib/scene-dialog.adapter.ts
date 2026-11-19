/** @Feature songs */

import { openDialogOnAttach } from './modal-dialog.adapter';
import { paintStatusBarLikeSceneWhileAttached } from './scene-status-bar.adapter';
import { holdScreenAwakeWhileAttached } from './scene-wake-lock.adapter';

// @FollowsBlueprint ref-callback-browser-api
export function openSceneOnAttach(dialog: HTMLDialogElement | null): void {
  openDialogOnAttach(dialog);
  holdScreenAwakeWhileAttached(dialog);
  paintStatusBarLikeSceneWhileAttached(dialog);
}
