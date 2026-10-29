import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { NotificationSettings } from './NotificationSettings';

const SAVED_SUBSCRIPTION = {
  endpoint: 'https://push.example/device',
  keys: { p256dh: 'p', auth: 'a' },
};

const device = vi.hoisted(() => ({
  isPushSupported: vi.fn(() => true),
  readNotificationPermission: vi.fn((): 'default' | 'granted' | 'denied' => 'default'),
  readInstallContext: vi.fn(() => ({ isIos: false, isStandalone: false })),
  readExistingPushSubscription: vi.fn((): Promise<typeof SAVED_SUBSCRIPTION | null> =>
    Promise.resolve(null),
  ),
  subscribeToPush: vi.fn(),
}));

vi.mock('../../lib/display-mode.adapter', () => ({
  readInstallContext: device.readInstallContext,
}));

vi.mock('../../lib/push-subscription.adapter', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...device,
}));

const PREFERENCES = {
  preferences: [
    { category: 'takes', enabled: true },
    { category: 'take_comments', enabled: true },
    { category: 'sessions', enabled: false },
    { category: 'setlists', enabled: true },
  ],
};

const ENABLE_LABEL = 'Enable on this device';
const ENABLED_MESSAGE = 'On for this device.';

function isChecked(element: HTMLElement): boolean {
  return element instanceof HTMLInputElement && element.checked;
}

async function readAlertText(): Promise<string> {
  const alert = await screen.findByRole('alert');
  return alert.textContent;
}

function renderSettings(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <NotificationSettings />
    </QueryClientProvider>,
  );
}

const preferenceWriteSchema = z.object({ category: z.string(), enabled: z.boolean() });

async function answerPreferenceWrite(request: Request): Promise<Response> {
  const written = preferenceWriteSchema.parse(await request.clone().json());
  return jsonResponse({
    preferences: PREFERENCES.preferences.map((toggle) =>
      toggle.category === written.category ? written : toggle,
    ),
  });
}

function answerApi(keyStatus = 200): ReturnType<typeof stubFetch> {
  return stubFetch((request) => {
    if (request.url.endsWith('/vapid-public-key')) {
      return Promise.resolve(
        keyStatus === 200
          ? jsonResponse({ key: 'AQID' })
          : jsonResponse({ error: 'internal' }, keyStatus),
      );
    }
    if (request.url.endsWith('/subscriptions')) {
      return Promise.resolve(jsonResponse({ ok: true }, 201));
    }
    if (request.method === 'PUT') return answerPreferenceWrite(request);
    return Promise.resolve(jsonResponse(PREFERENCES));
  });
}

// @FollowsBlueprint test-component-render
describe('NotificationSettings', () => {
  let api: ReturnType<typeof stubFetch> | null = null;

  beforeEach(() => {
    device.subscribeToPush.mockImplementation(() => {
      device.readNotificationPermission.mockReturnValue('granted');
      return Promise.resolve(SAVED_SUBSCRIPTION);
    });
  });

  afterEach(() => {
    cleanup();
    api?.restore();
    api = null;
    vi.clearAllMocks();
    device.isPushSupported.mockReturnValue(true);
    device.readNotificationPermission.mockReturnValue('default');
    device.readInstallContext.mockReturnValue({ isIos: false, isStandalone: false });
  });

  it('lists the four categories with the state the member saved', async () => {
    api = answerApi();
    renderSettings();
    expect(isChecked(await screen.findByRole('checkbox', { name: 'New takes' }))).toBe(true);
    expect(isChecked(screen.getByRole('checkbox', { name: 'Comments on takes' }))).toBe(true);
    expect(isChecked(screen.getByRole('checkbox', { name: 'Sessions' }))).toBe(false);
    expect(
      isChecked(screen.getByRole('checkbox', { name: 'Setlists, lineups and transitions' })),
    ).toBe(true);
  });

  it('enables push on this device and then says it is on', async () => {
    api = answerApi();
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: ENABLE_LABEL }));
    expect(await screen.findByText(ENABLED_MESSAGE)).not.toBeNull();
    expect(device.subscribeToPush).toHaveBeenCalledWith('AQID');
    expect(screen.queryByRole('button', { name: ENABLE_LABEL })).toBeNull();
  });

  it('says enabling failed, before asking the browser, when the key route fails', async () => {
    api = answerApi(500);
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: ENABLE_LABEL }));
    expect(await readAlertText()).toBe('Could not be enabled.');
    expect(device.subscribeToPush).not.toHaveBeenCalled();
  });

  it('says the browser blocks notifications when the member refuses the prompt', async () => {
    api = answerApi();
    const { NotificationPermissionRefusedError } = await vi.importActual<
      typeof import('../../lib/push-subscription.adapter')
    >('../../lib/push-subscription.adapter');
    device.subscribeToPush.mockRejectedValue(new NotificationPermissionRefusedError('denied'));
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: ENABLE_LABEL }));
    expect(await readAlertText()).toMatch(/Blocked by this browser/);
  });

  it('says enabling failed when anything else goes wrong', async () => {
    api = answerApi();
    device.subscribeToPush.mockRejectedValue(new Error('push service unreachable'));
    renderSettings();
    await userEvent.click(await screen.findByRole('button', { name: ENABLE_LABEL }));
    expect(await readAlertText()).toBe('Could not be enabled.');
  });

  it('tells an iPhone in the browser to install pragma, with no Enable button', async () => {
    api = answerApi();
    device.isPushSupported.mockReturnValue(false);
    device.readInstallContext.mockReturnValue({ isIos: true, isStandalone: false });
    renderSettings();
    expect(await screen.findByText(/home screen/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: ENABLE_LABEL })).toBeNull();
  });

  it('says so in a browser that has no push and in one that blocks it', async () => {
    api = answerApi();
    device.isPushSupported.mockReturnValue(false);
    renderSettings();
    expect(await screen.findByText('Not available in this browser.')).not.toBeNull();
    cleanup();
    device.isPushSupported.mockReturnValue(true);
    device.readNotificationPermission.mockReturnValue('denied');
    renderSettings();
    expect(await screen.findByText(/Blocked by this browser/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: ENABLE_LABEL })).toBeNull();
  });

  it('shows this device as enabled when it already holds a subscription', async () => {
    api = answerApi();
    device.readNotificationPermission.mockReturnValue('granted');
    device.readExistingPushSubscription.mockResolvedValue(SAVED_SUBSCRIPTION);
    renderSettings();
    expect(await screen.findByText(ENABLED_MESSAGE)).not.toBeNull();
  });

  it('saves a toggle and keeps it flipped from the answer', async () => {
    const stub = answerApi();
    api = stub;
    renderSettings();
    const sessions = await screen.findByRole('checkbox', { name: 'Sessions' });
    await userEvent.click(sessions);
    expect(isChecked(sessions)).toBe(true);
    await waitFor(() => {
      expect(stub.calls.some((call) => call.method === 'PUT')).toBe(true);
    });
    const saved = stub.calls.find((call) => call.method === 'PUT');
    expect(await saved?.json()).toEqual({ category: 'sessions', enabled: true });
  });

  it('says a toggle could not be saved when the server refuses it, and puts it back', async () => {
    api = stubFetch((request) =>
      Promise.resolve(
        request.method === 'PUT' ? jsonResponse({ error: 'boom' }, 500) : jsonResponse(PREFERENCES),
      ),
    );
    renderSettings();
    const takes = await screen.findByRole('checkbox', { name: 'New takes' });
    await userEvent.click(takes);
    expect(await readAlertText()).toBe('That change could not be saved.');
    expect(isChecked(takes)).toBe(true);
  });
});
