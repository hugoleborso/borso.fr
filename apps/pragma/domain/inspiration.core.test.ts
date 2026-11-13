import { describe, expect, it } from 'vitest';
import {
  buildYoutubeSearchUrl,
  buildYoutubeWatchUrl,
  isPassageAccepted,
  PASSAGE_LONGEST_SECONDS,
  parseYoutubeVideoId,
  selectPassageRefusal,
} from './inspiration.core';

const VIDEO_ID = 'dQw4w9WgXcQ';

// @FollowsBlueprint test-pure-unit
describe('parseYoutubeVideoId', () => {
  it('reads the id from watch, youtu.be and shorts links and refuses a playlist or a channel', () => {
    expect(parseYoutubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}&t=42s`)).toBe(VIDEO_ID);
    expect(parseYoutubeVideoId(`https://m.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(parseYoutubeVideoId(`https://youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(parseYoutubeVideoId(`https://music.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(parseYoutubeVideoId(`  https://youtu.be/${VIDEO_ID}?si=share  `)).toBe(VIDEO_ID);
    expect(parseYoutubeVideoId(`https://www.youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(parseYoutubeVideoId('https://www.youtube.com/playlist?list=PL123')).toBeNull();
    expect(parseYoutubeVideoId('https://www.youtube.com/@philcollins')).toBeNull();
  });

  it('refuses a link that is not an address, not YouTube, or carries no well formed id', () => {
    expect(parseYoutubeVideoId('call me maybe')).toBeNull();
    expect(parseYoutubeVideoId(`https://vimeo.com/watch?v=${VIDEO_ID}`)).toBeNull();
    expect(parseYoutubeVideoId('https://www.youtube.com/watch')).toBeNull();
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseYoutubeVideoId('https://youtu.be/')).toBeNull();
    expect(parseYoutubeVideoId('https://www.youtube.com/shorts')).toBeNull();
    expect(parseYoutubeVideoId(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBeNull();
  });
});

describe('selectPassageRefusal', () => {
  it('accepts a passage that ends after it starts and lasts at most ten minutes', () => {
    expect(selectPassageRefusal({ startSeconds: 52, endSeconds: 64 })).toBeNull();
    expect(
      selectPassageRefusal({ startSeconds: 0, endSeconds: PASSAGE_LONGEST_SECONDS }),
    ).toBeNull();
    expect(isPassageAccepted({ startSeconds: 52, endSeconds: 64 })).toBe(true);
  });

  it('refuses an end at or before the start', () => {
    expect(selectPassageRefusal({ startSeconds: 64, endSeconds: 64 })).toBe('end-not-after-start');
    expect(selectPassageRefusal({ startSeconds: 64, endSeconds: 52 })).toBe('end-not-after-start');
    expect(isPassageAccepted({ startSeconds: 64, endSeconds: 64 })).toBe(false);
  });

  it('refuses a passage one second longer than ten minutes', () => {
    expect(selectPassageRefusal({ startSeconds: 10, endSeconds: 611 })).toBe('passage-too-long');
  });
});

describe('the YouTube addresses', () => {
  it('searches YouTube for the artist then the title, skipping a blank part', () => {
    expect(buildYoutubeSearchUrl(' Carly Rae Jepsen ', 'Call Me Maybe')).toBe(
      'https://www.youtube.com/results?search_query=Carly+Rae+Jepsen+Call+Me+Maybe',
    );
    expect(buildYoutubeSearchUrl('', 'In the Air Tonight')).toBe(
      'https://www.youtube.com/results?search_query=In+the+Air+Tonight',
    );
  });

  it('opens the video on YouTube at the start second', () => {
    expect(buildYoutubeWatchUrl(VIDEO_ID, 220)).toBe(
      `https://www.youtube.com/watch?v=${VIDEO_ID}&t=220`,
    );
  });
});
