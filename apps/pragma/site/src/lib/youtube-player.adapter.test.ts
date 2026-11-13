import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachPassagePlayer,
  loadYoutubeNamespace,
  type PassagePlayback,
  type PassagePlayerControl,
  YOUTUBE_IFRAME_API_ADDRESS,
  type YoutubeEnvironment,
} from './youtube-player.adapter';

const PASSAGE: PassagePlayback = {
  videoId: 'dQw4w9WgXcQ',
  startSeconds: 220,
  endSeconds: 232,
  isAutoplayed: true,
};

interface CreatedPlayer {
  readonly host: HTMLElement;
  readonly options: {
    readonly videoId: string;
    readonly playerVars: Readonly<Record<string, string | number>>;
    readonly events: { readonly onError: (event: { readonly data: number }) => void };
  };
  readonly destroy: ReturnType<typeof vi.fn>;
}

function buildNamespace(currentTime: number) {
  const created: CreatedPlayer[] = [];
  class Player {
    readonly destroy = vi.fn();
    constructor(host: HTMLElement, options: CreatedPlayer['options']) {
      created.push({ host, options, destroy: this.destroy });
    }
    getCurrentTime(): number {
      return currentTime;
    }
  }
  return { namespace: { Player }, created };
}

function buildEnvironment(window: object = {}): YoutubeEnvironment {
  return { window, document, origin: 'https://pragma.example' };
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function recordControl() {
  const slot: { control: PassagePlayerControl | null } = { control: null };
  return {
    onControl: (control: PassagePlayerControl) => {
      slot.control = control;
    },
    read: () => slot.control?.readCurrentSecond(),
  };
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

// @FollowsBlueprint test-pure-unit
describe('attachPassagePlayer', () => {
  it('hands the player the clip’s start and end seconds', async () => {
    const { namespace, created } = buildNamespace(225.7);
    const element = document.createElement('div');
    const control = recordControl();

    attachPassagePlayer(
      element,
      PASSAGE,
      { onBlocked: vi.fn(), onControl: control.onControl },
      buildEnvironment({ YT: namespace }),
    );
    await flushPromises();

    expect(created).toHaveLength(1);
    expect(created[0]?.options.videoId).toBe('dQw4w9WgXcQ');
    expect(created[0]?.options.playerVars).toEqual({
      start: 220,
      end: 232,
      autoplay: 1,
      playsinline: 1,
      rel: 0,
      origin: 'https://pragma.example',
    });
    expect(created[0]?.host.parentElement).toBe(element);
    expect(control.read()).toBe(225);
  });

  it('plays on past the start with no end, and reads the start until the player is ready', () => {
    const { namespace, created } = buildNamespace(0);
    const control = recordControl();
    const environment = buildEnvironment({ YT: namespace });

    attachPassagePlayer(
      document.createElement('div'),
      { ...PASSAGE, endSeconds: null, isAutoplayed: false },
      { onBlocked: vi.fn(), onControl: control.onControl },
      environment,
    );

    expect(control.read()).toBe(220);
    expect(created).toEqual([]);
  });

  it('leaves out the end when the passage has none', async () => {
    const { namespace, created } = buildNamespace(0);
    attachPassagePlayer(
      document.createElement('div'),
      { ...PASSAGE, endSeconds: null, isAutoplayed: false },
      { onBlocked: vi.fn(), onControl: vi.fn() },
      buildEnvironment({ YT: namespace }),
    );
    await flushPromises();
    expect(created[0]?.options.playerVars).toEqual({
      start: 220,
      autoplay: 0,
      playsinline: 1,
      rel: 0,
      origin: 'https://pragma.example',
    });
  });

  it('reads errors 101 and 150 as a blocked embed, and a missing video id error as not', async () => {
    const { namespace, created } = buildNamespace(0);
    const onBlocked = vi.fn();
    attachPassagePlayer(
      document.createElement('div'),
      PASSAGE,
      { onBlocked, onControl: vi.fn() },
      buildEnvironment({ YT: namespace }),
    );
    await flushPromises();
    const onError = created[0]?.options.events.onError;

    onError?.({ data: 2 });
    expect(onBlocked).not.toHaveBeenCalled();
    onError?.({ data: 101 });
    onError?.({ data: 150 });
    expect(onBlocked).toHaveBeenCalledTimes(2);
  });

  it('offers YouTube instead when the API script fails to load', async () => {
    const onBlocked = vi.fn();
    attachPassagePlayer(
      document.createElement('div'),
      PASSAGE,
      { onBlocked, onControl: vi.fn() },
      buildEnvironment(),
    );
    document.head.querySelector('script')?.dispatchEvent(new Event('error'));
    await flushPromises();
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it('destroys the player and empties its element when React lets it go', async () => {
    const { namespace, created } = buildNamespace(0);
    const element = document.createElement('div');
    const detach = attachPassagePlayer(
      element,
      PASSAGE,
      { onBlocked: vi.fn(), onControl: vi.fn() },
      buildEnvironment({ YT: namespace }),
    );
    await flushPromises();

    detach?.();

    expect(created[0]?.destroy).toHaveBeenCalledTimes(1);
    expect(element.childElementCount).toBe(0);
  });

  it('builds no player when it is let go before the API has loaded', async () => {
    const { namespace, created } = buildNamespace(0);
    const detach = attachPassagePlayer(
      document.createElement('div'),
      PASSAGE,
      { onBlocked: vi.fn(), onControl: vi.fn() },
      buildEnvironment({ YT: namespace }),
    );
    detach?.();
    await flushPromises();
    expect(created).toEqual([]);
  });

  it('does nothing for the element React has already let go', () => {
    expect(
      attachPassagePlayer(null, PASSAGE, { onBlocked: vi.fn(), onControl: vi.fn() }),
    ).toBeUndefined();
  });
});

describe('loadYoutubeNamespace', () => {
  it('loads the API script once, and keeps the callback another script had set', async () => {
    const { namespace } = buildNamespace(0);
    const previousCallback = vi.fn();
    const window: Record<string, unknown> = { onYouTubeIframeAPIReady: previousCallback };
    const environment = buildEnvironment(window);

    const first = loadYoutubeNamespace(environment);
    const second = loadYoutubeNamespace(environment);
    const scripts = [...document.head.querySelectorAll('script')];
    window.YT = namespace;
    const ready = window.onYouTubeIframeAPIReady;
    if (typeof ready === 'function') ready();

    expect(scripts.map((script) => script.src)).toEqual([YOUTUBE_IFRAME_API_ADDRESS]);
    expect(await first).toBe(namespace);
    expect(await second).toBe(namespace);
    expect(previousCallback).toHaveBeenCalledTimes(1);
  });

  it('waits on when the ready callback fires before the player is defined', async () => {
    const { namespace } = buildNamespace(0);
    const window: Record<string, unknown> = { YT: { loading: 1 } };
    const pending = loadYoutubeNamespace(buildEnvironment(window));
    const ready = window.onYouTubeIframeAPIReady;
    if (typeof ready === 'function') ready();
    window.YT = namespace;
    if (typeof ready === 'function') ready();
    expect(await pending).toBe(namespace);
  });

  it('loads the API script when the page set its namespace to null', () => {
    void loadYoutubeNamespace(buildEnvironment({ YT: null })).catch(() => undefined);
    expect(document.head.querySelector('script')?.src).toBe(YOUTUBE_IFRAME_API_ADDRESS);
  });

  it('fails when the API script does not load', async () => {
    const pending = loadYoutubeNamespace(buildEnvironment());
    document.head.querySelector('script')?.dispatchEvent(new Event('error'));
    await expect(pending).rejects.toThrow('the YouTube iframe API did not load');
  });

  it('uses the API a page has already loaded', async () => {
    const { namespace } = buildNamespace(0);
    expect(await loadYoutubeNamespace(buildEnvironment({ YT: namespace }))).toBe(namespace);
    expect(document.head.querySelectorAll('script')).toHaveLength(0);
  });

  it('reads the browser window when no environment is given', () => {
    const detach = attachPassagePlayer(document.createElement('div'), PASSAGE, {
      onBlocked: vi.fn(),
      onControl: vi.fn(),
    });
    expect(document.head.querySelector('script')?.src).toBe(YOUTUBE_IFRAME_API_ADDRESS);
    detach?.();
  });
});
