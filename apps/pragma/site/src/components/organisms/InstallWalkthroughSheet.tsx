/** @Feature install-offer */

import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  type InstallStep,
  type InstallWalkthrough,
  installStepsOf,
} from '../../lib/install-offer.utils';
import { Button } from '../atoms/Button';
import { InstallPhoneScreen } from '../molecules/InstallPhoneScreen';
import { Sheet } from '../molecules/Sheet';

export interface InstallWalkthroughSheetProps {
  readonly walkthrough: InstallWalkthrough;
  readonly onInstall: (() => void) | null;
  readonly onClose: () => void;
}

const STEP_CAPTION_KEY: Readonly<Record<InstallStep, ParseKeys>> = {
  'open-in-safari': 'install.steps.openInSafari',
  'tap-share': 'install.steps.tapShare',
  'scroll-share-sheet': 'install.steps.scrollShareSheet',
  'tap-add-to-home-screen': 'install.steps.tapAddToHomeScreen',
  'confirm-add': 'install.steps.confirmAdd',
  'tap-browser-menu': 'install.steps.tapBrowserMenu',
  'tap-install-app': 'install.steps.tapInstallApp',
  'confirm-install': 'install.steps.confirmInstall',
};

const SECONDS_PER_STEP = 2.8;
const PERCENT_PER_SLIDE = 100;

function animateWalkthrough(stepCount: number): { width: string; animation: string } {
  return {
    width: `${stepCount * PERCENT_PER_SLIDE}%`,
    animation: `install-walkthrough-advance ${stepCount * SECONDS_PER_STEP}s steps(${stepCount}) infinite`,
  };
}

// @FollowsBlueprint organism-presentational
export function InstallWalkthroughSheet({
  walkthrough,
  onInstall,
  onClose,
}: InstallWalkthroughSheetProps): JSX.Element {
  const { t } = useTranslation();
  const steps = installStepsOf(walkthrough);
  return (
    <Sheet
      title={t('install.title')}
      label={t('install.title')}
      onClose={onClose}
      footer={
        onInstall === null ? undefined : (
          <Button variant="primary" size="lg" icon="install" onClick={onInstall} className="w-full">
            {t('install.installNow')}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <section
          aria-label={t('install.walkthrough')}
          className="motion-reduce:hidden overflow-hidden"
        >
          <div className="flex" style={animateWalkthrough(steps.length)}>
            {steps.map((step, index) => (
              <div key={step} className="flex-1 flex flex-col items-center gap-3">
                <InstallPhoneScreen step={step} />
                <p className="m-0 px-2 text-center text-meta text-ink">
                  <span className="mr-1.5 text-ink-soft tabular-nums">{index + 1}.</span>
                  {t(STEP_CAPTION_KEY[step])}
                </p>
              </div>
            ))}
          </div>
        </section>

        <ol
          aria-label={t('install.walkthrough')}
          className="hidden motion-reduce:flex flex-col gap-4 m-0 p-0 list-none"
        >
          {steps.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <InstallPhoneScreen step={step} />
              <p className="m-0 text-meta text-ink">
                <span className="mr-1.5 text-ink-soft tabular-nums">{index + 1}.</span>
                {t(STEP_CAPTION_KEY[step])}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Sheet>
  );
}
