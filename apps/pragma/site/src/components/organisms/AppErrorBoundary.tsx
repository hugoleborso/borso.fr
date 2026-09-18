/** @Feature shell */

import { Component, type ErrorInfo, type JSX, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { discardCachesAndReload, reload } from '../../lib/recovery.adapter';

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly hasFailed: boolean;
}

const INITIAL_STATE: AppErrorBoundaryState = { hasFailed: false };

function startRecovery(): void {
  void discardCachesAndReload();
}

function CrashScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="h-dvh w-full bg-bg text-ink-900 flex flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <Icon name="warn" size={24} />
      <h1 className="font-display italic text-2xl m-0">{t('crash.title')}</h1>
      <p className="text-ink-500 text-sm max-w-sm m-0">{t('crash.body')}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="accent" onClick={reload}>
          {t('crash.reload')}
        </Button>
        <Button onClick={startRecovery}>{t('crash.reset')}</Button>
      </div>
    </div>
  );
}

/**
 * @Blueprint organism-error-boundary
 * @BlueprintName Organism Catching A Render Failure
 * @BlueprintUsage Use once, around the whole routed tree, so a thrown render leaves a message on the screen instead of an empty document.
 * @BlueprintDescription React unmounts the entire tree when a render throws and nothing catches it, which leaves `#root` empty and the page showing only the body background — a blank screen carrying no cause and no way out. This is the one place a class component is still required, because `getDerivedStateFromError` has no hook equivalent. It holds a single boolean, delegates every visible decision to a function component that may use hooks, and offers both recoveries a stuck client needs: a plain reload, and a reload that first discards the caches a service worker may be serving from.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasFailed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('pragma crashed while rendering', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasFailed) return <CrashScreen />;
    return this.props.children;
  }
}
