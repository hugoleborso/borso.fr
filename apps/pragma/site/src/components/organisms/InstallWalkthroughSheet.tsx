/** @Feature install-offer */

import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  type InstallStep,
  type InstallWalkthrough,
  installStepsOf,
} from '../../lib/install-offer.utils';
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { InstallPhoneScreen } from '../molecules/InstallPhoneScreen';

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
    <dialog
      ref={openDismissibleDialogOnAttach}
      onClose={onClose}
      aria-label={t('install.title')}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[26rem] max-w-[26rem] max-h-[90dvh] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="flex items-center justify-between pl-4 pr-1 py-1 border-b border-line">
        <h2 className="m-0 font-display italic text-xl text-ink-900">{t('install.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="inline-flex items-center justify-center w-11 h-11 rounded-md text-ink-500 hover:text-ink-900 bg-transparent border-0 cursor-pointer"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <section
          aria-label={t('install.walkthrough')}
          className="motion-reduce:hidden overflow-hidden"
        >
          <div className="flex" style={animateWalkthrough(steps.length)}>
            {steps.map((step, index) => (
              <div key={step} className="flex-1 flex flex-col items-center gap-3">
                <InstallPhoneScreen step={step} />
                <p className="m-0 px-2 text-center text-sm text-ink-900">
                  <span className="font-mono text-ink-500 mr-1.5">{index + 1}.</span>
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
              <p className="m-0 text-sm text-ink-900">
                <span className="font-mono text-ink-500 mr-1.5">{index + 1}.</span>
                {t(STEP_CAPTION_KEY[step])}
              </p>
            </li>
          ))}
        </ol>

        {onInstall === null ? null : (
          <Button variant="primary" size="lg" onClick={onInstall} className="w-full">
            <Icon name="install" size={16} />
            {t('install.installNow')}
          </Button>
        )}
      </div>
    </dialog>
  );
}
