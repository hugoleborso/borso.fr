/** @Feature install-offer */

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import type { InstallStep } from '../../lib/install-offer.utils';
import { composeClassName } from '../atoms/class-name.utils';

export interface InstallPhoneScreenProps {
  readonly step: InstallStep;
}

const PAGE_LINE_WIDTHS: readonly string[] = ['w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-full'];
const SHARE_SHEET_ROW_COUNT = 4;
const MENU_ROW_COUNT = 3;

function TapTarget({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <span className="relative inline-flex items-center justify-center">
      {children}
      <span className="absolute -inset-1.5 rounded-full border-2 border-accent" />
      <span className="absolute -inset-1.5 rounded-full border-2 border-accent motion-safe:animate-ping" />
    </span>
  );
}

function PageLines(): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      {PAGE_LINE_WIDTHS.map((width, index) => (
        <span
          key={index}
          className={composeClassName('block h-1.5 rounded-full bg-line-strong', width)}
        />
      ))}
    </div>
  );
}

function GreyRows({ count }: { readonly count: number }): JSX.Element {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="flex items-center gap-2 px-3 py-2 border-b border-line">
          <span className="block h-1.5 w-1/2 rounded-full bg-line-strong" />
        </span>
      ))}
    </>
  );
}

function AppTile(): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-ink-900 text-bg-elev font-display italic text-xl">
      {t('appName').charAt(0)}
    </span>
  );
}

function AddressBar({ trailing }: { readonly trailing: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center gap-2 mx-2 mt-2 px-2 h-7 rounded-full bg-bg-sunk text-ink-500">
      <span className="block h-1.5 flex-1 rounded-full bg-line-strong" />
      {trailing}
    </div>
  );
}

function OpenInSafariScreen(): JSX.Element {
  return (
    <>
      <AddressBar
        trailing={
          <TapTarget>
            <Icon name="copy" size={12} />
          </TapTarget>
        }
      />
      <PageLines />
    </>
  );
}

function SafariToolbarScreen(): JSX.Element {
  return (
    <>
      <PageLines />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-around h-10 border-t border-line bg-bg-sunk text-accent">
        <Icon name="chevL" size={14} />
        <Icon name="chevR" size={14} />
        <TapTarget>
          <Icon name="share" size={14} />
        </TapTarget>
        <Icon name="copy" size={14} />
      </div>
    </>
  );
}

function ShareSheet({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <>
      <PageLines />
      <div className="absolute inset-x-0 bottom-0 top-1/4 rounded-t-xl bg-bg-sunk border-t border-line-strong flex flex-col overflow-hidden">
        <div className="flex justify-around px-2 py-2.5 border-b border-line">
          {Array.from({ length: SHARE_SHEET_ROW_COUNT }, (_, index) => (
            <span key={index} className="block w-7 h-7 rounded-lg bg-line-strong" />
          ))}
        </div>
        {children}
      </div>
    </>
  );
}

function ScrollShareSheetScreen(): JSX.Element {
  return (
    <ShareSheet>
      <GreyRows count={SHARE_SHEET_ROW_COUNT} />
      <span className="absolute right-2 bottom-4 text-accent motion-safe:animate-bounce">
        <Icon name="chevD" size={16} className="rotate-180" />
      </span>
    </ShareSheet>
  );
}

function AddToHomeScreenScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <ShareSheet>
      <GreyRows count={1} />
      <span className="flex items-center justify-between gap-2 px-3 py-2 border-b border-line text-[11px] text-ink-900">
        <TapTarget>
          <span className="px-1">{t('install.screen.addToHomeScreen')}</span>
        </TapTarget>
        <Icon name="addSquare" size={14} />
      </span>
      <GreyRows count={2} />
    </ShareSheet>
  );
}

function ConfirmAddScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 h-10 border-b border-line text-[11px] text-accent">
        <span>{t('install.screen.cancel')}</span>
        <TapTarget>
          <span className="px-1 font-semibold">{t('install.screen.add')}</span>
        </TapTarget>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-3">
        <AppTile />
        <span className="text-xs text-ink-900">{t('appName')}</span>
      </div>
    </div>
  );
}

function ChromeMenuScreen(): JSX.Element {
  return (
    <>
      <AddressBar
        trailing={
          <TapTarget>
            <Icon name="moreVertical" size={14} />
          </TapTarget>
        }
      />
      <PageLines />
    </>
  );
}

function InstallAppItemScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <AddressBar trailing={<Icon name="moreVertical" size={14} />} />
      <PageLines />
      <div className="absolute right-1.5 top-8 w-[75%] rounded-md bg-bg-elev border border-line-strong shadow-lg flex flex-col">
        <GreyRows count={MENU_ROW_COUNT} />
        <span className="flex items-center gap-2 px-3 py-2 text-[11px] text-ink-900">
          <Icon name="install" size={12} />
          <TapTarget>
            <span className="px-1">{t('install.screen.installApp')}</span>
          </TapTarget>
        </span>
      </div>
    </>
  );
}

function ConfirmInstallScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <PageLines />
      <div className="absolute inset-0 bg-ink-900/40 flex items-center justify-center px-3">
        <div className="w-full rounded-lg bg-bg-elev p-3 flex flex-col gap-2 shadow-lg">
          <span className="text-xs font-semibold text-ink-900">
            {t('install.screen.installQuestion')}
          </span>
          <span className="flex items-center gap-2 text-[11px] text-ink-700">
            <AppTile />
            {t('appName')}
          </span>
          <span className="flex justify-end gap-3 text-[11px] text-accent">
            <span>{t('install.screen.cancel')}</span>
            <TapTarget>
              <span className="px-1 font-semibold">{t('install.screen.install')}</span>
            </TapTarget>
          </span>
        </div>
      </div>
    </>
  );
}

const SCREEN_BY_STEP: Readonly<Record<InstallStep, () => JSX.Element>> = {
  'open-in-safari': OpenInSafariScreen,
  'tap-share': SafariToolbarScreen,
  'scroll-share-sheet': ScrollShareSheetScreen,
  'tap-add-to-home-screen': AddToHomeScreenScreen,
  'confirm-add': ConfirmAddScreen,
  'tap-browser-menu': ChromeMenuScreen,
  'tap-install-app': InstallAppItemScreen,
  'confirm-install': ConfirmInstallScreen,
};

// @FollowsBlueprint molecule-presentational
export function InstallPhoneScreen({ step }: InstallPhoneScreenProps): JSX.Element {
  const Screen = SCREEN_BY_STEP[step];
  return (
    <div
      aria-hidden="true"
      className="relative w-[168px] h-[264px] shrink-0 rounded-[26px] border-[5px] border-ink-900 bg-bg overflow-hidden"
    >
      <span className="block mx-auto mt-1 w-12 h-1.5 rounded-full bg-ink-900" />
      <Screen />
    </div>
  );
}
