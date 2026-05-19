/**
 * Login page — the only public route. Submits the shared password to
 * POST /api/auth/login, redirects to the originating page on success
 * (or /catalog if there isn't one), surfaces the spec-defined error
 * states (rate-limited, wrong password, not bootstrapped).
 *
 * Design bundle source of truth: cream paper, centred card, blue
 * accent on the submit button.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, apiRequest } from '../lib/api-client';

const locationStateSchema = z.object({ from: z.string().min(1) }).partial();

function readFromState(state: unknown): string {
  const parsed = locationStateSchema.safeParse(state);
  if (!parsed.success) return '/catalog';
  return parsed.data.from ?? '/catalog';
}

export function Login(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/api/auth/login', { method: 'POST', body: { password } });
      navigate(readFromState(location.state), { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 429) setError(t('auth.rateLimited'));
        else if (caught.status === 401) setError(t('auth.invalidPassword'));
        else if (caught.status === 503) setError(t('auth.notBootstrapped'));
        else setError(t('auth.unknownError'));
      } else {
        setError(t('auth.unknownError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <h1 className="login-title">{t('auth.title')}</h1>
        <form onSubmit={submit} className="login-form">
          <label className="login-label" htmlFor="login-password">
            {t('auth.passwordLabel')}
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="login-input"
            autoComplete="current-password"
            required
            minLength={8}
          />
          <button type="submit" className="login-submit" disabled={submitting}>
            {t('auth.submit')}
          </button>
          {error !== null ? <p className="login-error">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
