/** @Feature install-offer */

import { useSyncExternalStore } from 'react';
import {
  type DeferredInstallPrompt,
  readDeferredInstallPrompt,
  subscribeToInstallPrompt,
} from '../../lib/install-prompt.adapter';

function readNoInstallPromptOnServer(): DeferredInstallPrompt | null {
  return null;
}

// @FollowsBlueprint hook-external-store
export function useDeferredInstallPrompt(): DeferredInstallPrompt | null {
  return useSyncExternalStore(
    subscribeToInstallPrompt,
    readDeferredInstallPrompt,
    readNoInstallPromptOnServer,
  );
}
