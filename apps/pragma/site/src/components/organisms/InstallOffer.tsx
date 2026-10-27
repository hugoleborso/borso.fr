/** @Feature install-offer */

import { useState } from 'react';
import {
  type InstallWalkthrough,
  isInstallAccepted,
  isNativeInstallOffered,
  selectInstallWalkthrough,
} from '../../lib/install-offer.utils';
import {
  type DeferredInstallPrompt,
  didStoreInstallBannerDismissal,
  isInstallBannerDismissed,
  promptInstall,
  readInstallDevice,
} from '../../lib/install-prompt.adapter';
import { InstallBanner } from '../molecules/InstallBanner';
import { useDeferredInstallPrompt } from './install-prompt.hook';
import { InstallWalkthroughSheet } from './InstallWalkthroughSheet';

function selectOfferedPrompt(
  walkthrough: InstallWalkthrough,
  deferredPrompt: DeferredInstallPrompt | null,
): DeferredInstallPrompt | null {
  const isOffered = isNativeInstallOffered(walkthrough, deferredPrompt !== null);
  return isOffered ? deferredPrompt : null;
}

// @FollowsBlueprint molecule-local-state
export function InstallOffer(): JSX.Element | null {
  const deferredPrompt = useDeferredInstallPrompt();
  const [isDismissed, setIsDismissed] = useState<boolean>(isInstallBannerDismissed);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState<boolean>(false);
  const walkthrough = selectInstallWalkthrough({ ...readInstallDevice(), isDismissed });
  if (walkthrough === null) return null;

  const dismiss = (): void => {
    didStoreInstallBannerDismissal();
    setIsDismissed(true);
  };
  const closeWalkthrough = (): void => setIsWalkthroughOpen(false);
  const offeredPrompt = selectOfferedPrompt(walkthrough, deferredPrompt);
  const installWith = async (installPrompt: DeferredInstallPrompt): Promise<void> => {
    const choice = await promptInstall(installPrompt);
    const isAccepted = isInstallAccepted(choice);
    closeWalkthrough();
    if (isAccepted) dismiss();
  };

  return (
    <>
      <InstallBanner onShowWalkthrough={() => setIsWalkthroughOpen(true)} onDismiss={dismiss} />
      {isWalkthroughOpen ? (
        <InstallWalkthroughSheet
          walkthrough={walkthrough}
          onInstall={offeredPrompt === null ? null : () => void installWith(offeredPrompt)}
          onClose={closeWalkthrough}
        />
      ) : null}
    </>
  );
}
