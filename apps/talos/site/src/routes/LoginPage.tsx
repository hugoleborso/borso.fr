import type { JSX } from 'react';
import { AuthPanel } from '../components/organisms/AuthPanel';

// @FollowsBlueprint route-detail-page
export function LoginPage(): JSX.Element {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10 bg-bg">
      <AuthPanel />
    </main>
  );
}
