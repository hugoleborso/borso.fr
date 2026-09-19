import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BananaIcon } from '../atoms/BananaIcon';

export interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly failed: boolean;
}

// @FollowsBlueprint organism-error-boundary
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(failure: Error, info: ErrorInfo): void {
    console.error('banana-rush crashed', failure, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <CrashScreen />;
  }
}

function CrashScreen() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <BananaIcon className="h-16 w-16" />
      <p className="text-lg font-black">{t('errors.unexpected-failure')}</p>
      <a
        href="/"
        className="min-h-14 rounded-chunk border-[3px] border-ink bg-peel px-5 py-3 font-extrabold shadow-chunk"
      >
        {t('errors.reload')}
      </a>
    </main>
  );
}
