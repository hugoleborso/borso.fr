/**
 * @DependsOnExternal youtube
 * @Feature inspirations
 */

export const YOUTUBE_IFRAME_API_ADDRESS = 'https://www.youtube.com/iframe_api';

const VIDEO_NOT_FOUND_ERROR = 100;
const EMBEDDING_REFUSED_ERROR = 101;
const EMBEDDING_REFUSED_ALIAS_ERROR = 150;
const REFERRER_MISSING_ERROR = 153;
const BLOCKED_EMBED_ERROR_CODES: ReadonlySet<number> = new Set([
  VIDEO_NOT_FOUND_ERROR,
  EMBEDDING_REFUSED_ERROR,
  EMBEDDING_REFUSED_ALIAS_ERROR,
  REFERRER_MISSING_ERROR,
]);
const READY_CALLBACK_NAME = 'onYouTubeIframeAPIReady';
const NAMESPACE_NAME = 'YT';
const PLAYER_FULL_SIZE = '100%';
const PLAYER_FLAG_ON = 1;
const PLAYER_FLAG_OFF = 0;

export interface PassagePlayback {
  readonly videoId: string;
  readonly startSeconds: number;
  readonly endSeconds: number | null;
  readonly isAutoplayed: boolean;
}

export interface PassagePlayerEvents {
  readonly onBlocked: () => void;
}

export interface PassagePlayerControl {
  readonly readCurrentSecond: () => number;
}

interface YoutubePlayerHandle {
  readonly getCurrentTime: () => number;
  readonly destroy: () => void;
}

interface YoutubePlayerOptions {
  readonly videoId: string;
  readonly width: string;
  readonly height: string;
  readonly playerVars: Readonly<Record<string, string | number>>;
  readonly events: { readonly onError: (event: { readonly data: number }) => void };
}

interface YoutubeNamespace {
  readonly Player: new (host: HTMLElement, options: YoutubePlayerOptions) => YoutubePlayerHandle;
}

export interface YoutubeEnvironment {
  readonly window: object;
  readonly document: Document;
  readonly origin: string;
}

function isYoutubeNamespace(candidate: unknown): candidate is YoutubeNamespace {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof Reflect.get(candidate, 'Player') === 'function'
  );
}

function readNamespace(environment: YoutubeEnvironment): YoutubeNamespace | null {
  const candidate: unknown = Reflect.get(environment.window, NAMESPACE_NAME);
  return isYoutubeNamespace(candidate) ? candidate : null;
}

const pendingNamespaces = new WeakMap<object, Promise<YoutubeNamespace>>();

function isReadyCallback(candidate: unknown): candidate is () => void {
  return typeof candidate === 'function';
}

const ignoreReady = (): undefined => undefined;

function readPreviousReadyCallback(host: object): () => void {
  const candidate: unknown = Reflect.get(host, READY_CALLBACK_NAME);
  const isCallable = isReadyCallback(candidate);
  return isCallable ? candidate : ignoreReady;
}

function requestNamespace(environment: YoutubeEnvironment): Promise<YoutubeNamespace> {
  return new Promise((resolve, reject) => {
    const previousCallback = readPreviousReadyCallback(environment.window);
    Reflect.set(environment.window, READY_CALLBACK_NAME, () => {
      previousCallback();
      const namespace = readNamespace(environment);
      if (namespace !== null) resolve(namespace);
    });
    const script = environment.document.createElement('script');
    script.src = YOUTUBE_IFRAME_API_ADDRESS;
    script.addEventListener('error', () => {
      pendingNamespaces.delete(environment.window);
      script.remove();
      reject(new Error('the YouTube iframe API did not load'));
    });
    environment.document.head.append(script);
  });
}

export function loadYoutubeNamespace(environment: YoutubeEnvironment): Promise<YoutubeNamespace> {
  const loaded = readNamespace(environment);
  if (loaded !== null) return Promise.resolve(loaded);
  const pending = pendingNamespaces.get(environment.window) ?? requestNamespace(environment);
  pendingNamespaces.set(environment.window, pending);
  return pending;
}

function buildPlayerVariables(
  playback: PassagePlayback,
  origin: string,
): Readonly<Record<string, string | number>> {
  const endVariables: Readonly<Record<string, number>> =
    playback.endSeconds === null ? {} : { end: playback.endSeconds };
  return {
    start: playback.startSeconds,
    ...endVariables,
    autoplay: Number(playback.isAutoplayed),
    playsinline: PLAYER_FLAG_ON,
    rel: PLAYER_FLAG_OFF,
    origin,
  };
}

function readBrowserEnvironment(): YoutubeEnvironment {
  return { window, document, origin: window.location.origin };
}

// @FollowsBlueprint injected-browser-api
export function attachPassagePlayer(
  element: HTMLElement | null,
  playback: PassagePlayback,
  events: PassagePlayerEvents & { readonly onControl: (control: PassagePlayerControl) => void },
  environment: YoutubeEnvironment = readBrowserEnvironment(),
): (() => void) | undefined {
  if (element === null) return undefined;
  const host = environment.document.createElement('div');
  element.append(host);
  const lifecycle: { player?: YoutubePlayerHandle; isDetached?: true } = {};
  events.onControl({
    readCurrentSecond: () =>
      Math.floor(lifecycle.player?.getCurrentTime() ?? playback.startSeconds),
  });
  void loadYoutubeNamespace(environment).then(
    (namespace) => {
      if (lifecycle.isDetached === true) return;
      lifecycle.player = new namespace.Player(host, {
        videoId: playback.videoId,
        width: PLAYER_FULL_SIZE,
        height: PLAYER_FULL_SIZE,
        playerVars: buildPlayerVariables(playback, environment.origin),
        events: {
          onError: (event) => {
            const isBlockedEmbed = BLOCKED_EMBED_ERROR_CODES.has(event.data);
            if (isBlockedEmbed) events.onBlocked();
          },
        },
      });
    },
    () => {
      if (lifecycle.isDetached === true) return;
      events.onBlocked();
    },
  );
  return () => {
    lifecycle.isDetached = true;
    lifecycle.player?.destroy();
    element.replaceChildren();
  };
}
