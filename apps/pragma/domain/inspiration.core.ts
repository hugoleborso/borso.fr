/** @DependsOnExternal youtube */

export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const PASSAGE_LONGEST_SECONDS = 600;

export type PassageRefusal = 'end-not-after-start' | 'passage-too-long';

export interface Passage {
  readonly startSeconds: number;
  readonly endSeconds: number;
}

const YOUTUBE_WATCH_HOSTS: ReadonlySet<string> = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
]);
const YOUTUBE_SHORT_HOST = 'youtu.be';
const YOUTUBE_WATCH_PATH = '/watch';
const YOUTUBE_SHORTS_SEGMENT = 'shorts';
const YOUTUBE_SEARCH_ADDRESS = 'https://www.youtube.com/results';
const YOUTUBE_WATCH_ADDRESS = 'https://www.youtube.com/watch';

function readAddress(text: string): URL | null {
  try {
    return new URL(text.trim());
  } catch {
    return null;
  }
}

function readPathSegments(address: URL): readonly string[] {
  return address.pathname.split('/').filter((segment) => segment.length > 0);
}

function readCandidateVideoId(address: URL): string | null {
  if (address.host === YOUTUBE_SHORT_HOST) return readPathSegments(address)[0] ?? null;
  if (!YOUTUBE_WATCH_HOSTS.has(address.host)) return null;
  if (address.pathname === YOUTUBE_WATCH_PATH) return address.searchParams.get('v');
  const [firstSegment, secondSegment] = readPathSegments(address);
  return firstSegment === YOUTUBE_SHORTS_SEGMENT ? (secondSegment ?? null) : null;
}

// @FollowsBlueprint core-decision
export function parseYoutubeVideoId(link: string): string | null {
  const address = readAddress(link);
  if (address === null) return null;
  return readCandidateVideoId(address)?.match(YOUTUBE_VIDEO_ID_PATTERN)?.[0] ?? null;
}

// @FollowsBlueprint core-decision-table-for-a-lifecycle
export function selectPassageRefusal(passage: Passage): PassageRefusal | null {
  if (passage.endSeconds <= passage.startSeconds) return 'end-not-after-start';
  if (passage.endSeconds - passage.startSeconds > PASSAGE_LONGEST_SECONDS) {
    return 'passage-too-long';
  }
  return null;
}

// @FollowsBlueprint schema-refine-pure-helper
export function isPassageAccepted(passage: Passage): boolean {
  return selectPassageRefusal(passage) === null;
}

export function buildYoutubeSearchUrl(artist: string, title: string): string {
  const searchedWords = [artist.trim(), title.trim()].filter((words) => words.length > 0);
  const address = new URL(YOUTUBE_SEARCH_ADDRESS);
  address.searchParams.set('search_query', searchedWords.join(' '));
  return address.toString();
}

export function buildYoutubeWatchUrl(videoId: string, startSeconds: number): string {
  const address = new URL(YOUTUBE_WATCH_ADDRESS);
  address.searchParams.set('v', videoId);
  address.searchParams.set('t', String(startSeconds));
  return address.toString();
}
