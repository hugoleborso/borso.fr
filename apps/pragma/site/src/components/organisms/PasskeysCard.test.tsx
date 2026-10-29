import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { stubSheetDialog } from '../molecules/sheet.test-utils';
import { PasskeysCard } from './PasskeysCard';

const IPHONE_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const CREATED = { id: 'passkey-1', label: 'iPhone', createdAt: '2026-10-29T10:00:00.000Z' };

const passkeyBrowser = vi.hoisted(() => ({
  isPasskeySupported: vi.fn(() => true),
  startPasskeyEnrolment: vi.fn(() => Promise.resolve({ attestation: true })),
}));
vi.mock('../../lib/passkey.adapter', () => passkeyBrowser);

function answerPasskeysApi(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/me/passkeys/options') return jsonResponse({ challenge: 'abc' });
  if (pathname === '/api/me/passkeys' && request.method === 'POST') {
    return jsonResponse({ passkey: CREATED }, 201);
  }
  if (pathname === '/api/me/passkeys') return jsonResponse({ passkeys: [] });
  if (request.method === 'PATCH') {
    return jsonResponse({ passkey: { ...CREATED, label: 'Work phone' } });
  }
  return new Response(null, { status: 404 });
}

function renderCard(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <PasskeysCard />
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('PasskeysCard', () => {
  let stub: FetchStub | null = null;

  beforeEach(() => {
    stubSheetDialog();
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_AGENT);
    stub = stubFetch((request) => Promise.resolve(answerPasskeysApi(request)));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    stub?.restore();
  });

  it('holds one Turn on quick sign-in button and no text', async () => {
    renderCard();
    const button = await screen.findByRole('button', { name: 'Turn on quick sign-in' });
    const card = button.parentElement;
    expect(card?.textContent).toBe('Turn on quick sign-in');
    expect(screen.queryByRole('textbox')).toBe(null);
  });

  it('creates the passkey under a guessed name, then asks for the name in a sheet', async () => {
    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Turn on quick sign-in' }));
    const sheet = await screen.findByRole('dialog', { name: 'Name this device' });
    const registration = stub?.calls.find(
      (request) => request.method === 'POST' && request.url.endsWith('/api/me/passkeys'),
    );
    expect(await registration?.clone().json()).toMatchObject({ label: 'iPhone' });
    const field = within(sheet).getByLabelText('Name this device');
    expect(field).toHaveProperty('value', 'iPhone');

    fireEvent.change(field, { target: { value: 'Work phone' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBe(null);
    });
    const rename = stub?.calls.find((request) => request.method === 'PATCH');
    expect(rename?.url).toContain('/api/me/passkeys/passkey-1');
    expect(await rename?.clone().json()).toEqual({ label: 'Work phone' });
  });
});
