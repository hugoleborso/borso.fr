import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ssm = vi.hoisted(() => ({ send: vi.fn() }));

interface FreshModules {
  readonly readSecureParameter: typeof import('./parameter-store.client').readSecureParameter;
  readonly runInWideEvent: typeof import('../observability/wide-event.adapter').runInWideEvent;
}

async function importWithStubbedParameterStore(): Promise<FreshModules> {
  vi.resetModules();
  vi.doMock('@aws-sdk/client-ssm', () => ({
    SSMClient: class {
      send = ssm.send;
    },
    GetParameterCommand: class {
      constructor(readonly input: unknown) {}
    },
  }));
  const { readSecureParameter } = await import('./parameter-store.client');
  const { runInWideEvent } = await import('../observability/wide-event.adapter');
  return { readSecureParameter, runInWideEvent };
}

beforeEach(() => {
  ssm.send.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('@aws-sdk/client-ssm');
  vi.resetModules();
});

describe('readSecureParameter', () => {
  it('answers the decrypted value of the parameter', async () => {
    const { readSecureParameter } = await importWithStubbedParameterStore();
    ssm.send.mockResolvedValueOnce({ Parameter: { Value: 'secret' } });

    expect(await readSecureParameter('/talos/fire-url')).toBe('secret');
  });

  it('answers undefined for a parameter it cannot read and names it on the wide event', async () => {
    const { readSecureParameter, runInWideEvent } = await importWithStubbedParameterStore();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    ssm.send.mockRejectedValue(new TypeError('access denied'));

    const values = await runInWideEvent({}, async () => [
      await readSecureParameter('/talos/fire-url'),
      await readSecureParameter('/talos/fire-token'),
    ]);

    expect(values).toStrictEqual([undefined, undefined]);
    expect(write).toHaveBeenCalledOnce();
    expect(JSON.parse(String(write.mock.calls[0]?.[0]))).toMatchObject({
      'parameter_store.failed_parameters': ['/talos/fire-url', '/talos/fire-token'],
      'parameter_store.failure_types': ['TypeError', 'TypeError'],
    });
  });
});
