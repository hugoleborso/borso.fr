/**
 * Auth guard. Renders `<Outlet />` once the GET /api/auth/me probe
 * succeeds, redirects to /login on 401. Probe runs once per mount; the
 * /login route handles the bootstrap-vs-rotate distinction internally.
 *
 * Note: the API does not (yet) expose /auth/me; the probe is a cheap
 * GET on a gated endpoint (`/api/health` is public, so we use
 * `/api/instruments` since it is gated and side-effect-free). On
 * non-401 errors we still allow the user in — the route page itself
 * surfaces the error.
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ApiError, apiRequest } from '../lib/api-client';

type SessionState = 'probing' | 'authenticated' | 'redirecting';

export function RequireSession(): JSX.Element {
  const [state, setState] = useState<SessionState>('probing');
  const location = useLocation();

  // Probe the session once on mount. This is one of the rare effects
  // that synchronizes with an external system (the API) rather than
  // duplicating derived state — see CLAUDE.md "useEffect is a smell".
  useEffect(() => {
    let cancelled = false;
    const probe = async (): Promise<void> => {
      try {
        await apiRequest('/api/instruments');
        if (!cancelled) setState('authenticated');
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setState('redirecting');
        } else {
          // Network errors or other non-auth failures: let the user in
          // and the route render its own error state.
          setState('authenticated');
        }
      }
    };
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'probing') {
    return <div className="route-loading">…</div>;
  }
  if (state === 'redirecting') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
