/**
 * Auth guard. Renders `<Outlet />` once the gated probe succeeds,
 * redirects to /login on 401. The probe is a cheap GET on the gated
 * `/api/instruments` endpoint via `useSessionProbe()` — the API does
 * not (yet) expose `/api/auth/me`.
 */

import type { JSX } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionProbe } from '../../lib/queries/auth';

export function RequireSession(): JSX.Element {
  const location = useLocation();
  const probe = useSessionProbe();

  if (probe.isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-ink-400 text-sm">…</div>
    );
  }
  if (probe.data?.authenticated === false) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
