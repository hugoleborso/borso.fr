import { describe, expect, it } from 'vitest';
import {
  buildPosterObjectKey,
  encodeEditToken,
  hashEditToken,
  isConcert,
  isPosterKeyAcceptable,
  isUpcomingConcert,
  projectRegistrationList,
  projectWishedSong,
  startOfParisDay,
  toAnnouncementUpdate,
} from './concert-registrations.core';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const RANDOM_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const SONG_ID = '44444444-4444-4444-8444-444444444444';
const WINTER_EVENING = new Date('2026-11-26T21:30:00Z');
const WINTER_PARIS_MIDNIGHT = new Date('2026-11-25T23:00:00Z');
const SUMMER_EARLY_MORNING = new Date('2026-07-01T22:30:00Z');
const SUMMER_PARIS_MIDNIGHT = new Date('2026-07-01T22:00:00Z');
const ONE_MILLISECOND = 1;

// @FollowsBlueprint test-pure-unit
describe('the edit token', () => {
  it('encodes its random bytes as lower-case hexadecimal', () => {
    expect(encodeEditToken(new Uint8Array([0, 15, 255]))).toBe('000fff');
  });

  it('is stored as its sha256, so the stored value never opens the registration', () => {
    expect(hashEditToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('startOfParisDay', () => {
  it('answers midnight in Paris, an hour before UTC midnight in winter', () => {
    expect(startOfParisDay(WINTER_EVENING)).toEqual(WINTER_PARIS_MIDNIGHT);
  });

  it('answers the Paris day even when UTC is still on the day before', () => {
    expect(startOfParisDay(SUMMER_EARLY_MORNING)).toEqual(SUMMER_PARIS_MIDNIGHT);
  });
});

describe('isUpcomingConcert', () => {
  it('keeps a concert that started earlier today in Paris, so tonight stays open all evening', () => {
    expect(
      isUpcomingConcert({ kind: 'concert', date: WINTER_PARIS_MIDNIGHT }, WINTER_EVENING),
    ).toBe(true);
  });

  it('drops a concert from the day before', () => {
    const lastNight = new Date(WINTER_PARIS_MIDNIGHT.getTime() - ONE_MILLISECOND);
    expect(isUpcomingConcert({ kind: 'concert', date: lastNight }, WINTER_EVENING)).toBe(false);
  });

  it('refuses a practice and a session that does not exist', () => {
    expect(isUpcomingConcert({ kind: 'practice', date: WINTER_EVENING }, WINTER_EVENING)).toBe(
      false,
    );
    expect(isUpcomingConcert(null, WINTER_EVENING)).toBe(false);
  });
});

describe('isConcert', () => {
  it('answers yes for a concert only', () => {
    expect(isConcert({ kind: 'concert', date: WINTER_EVENING })).toBe(true);
    expect(isConcert({ kind: 'practice', date: WINTER_EVENING })).toBe(false);
    expect(isConcert(null)).toBe(false);
  });
});

describe('buildPosterObjectKey', () => {
  it('files a poster under its concert with the extension of its type', () => {
    expect(
      buildPosterObjectKey({
        sessionId: SESSION_ID,
        contentType: 'image/jpeg',
        randomId: RANDOM_ID,
      }),
    ).toBe(`poster/${SESSION_ID}/${RANDOM_ID}.jpg`);
    expect(
      buildPosterObjectKey({
        sessionId: SESSION_ID,
        contentType: 'image/png',
        randomId: RANDOM_ID,
      }),
    ).toBe(`poster/${SESSION_ID}/${RANDOM_ID}.png`);
    expect(
      buildPosterObjectKey({
        sessionId: SESSION_ID,
        contentType: 'image/webp',
        randomId: RANDOM_ID,
      }),
    ).toBe(`poster/${SESSION_ID}/${RANDOM_ID}.webp`);
  });
});

describe('isPosterKeyAcceptable', () => {
  it('accepts a poster of this concert, and clearing or leaving the poster alone', () => {
    expect(isPosterKeyAcceptable(`poster/${SESSION_ID}/${RANDOM_ID}.jpg`, SESSION_ID)).toBe(true);
    expect(isPosterKeyAcceptable(null, SESSION_ID)).toBe(true);
    expect(isPosterKeyAcceptable(undefined, SESSION_ID)).toBe(true);
  });

  it('refuses any other object, so the public page never signs a take or a chart', () => {
    expect(isPosterKeyAcceptable(`take/${SESSION_ID}/${RANDOM_ID}.m4a`, SESSION_ID)).toBe(false);
    expect(isPosterKeyAcceptable(`poster/${RANDOM_ID}/${SESSION_ID}.jpg`, SESSION_ID)).toBe(false);
  });
});

describe('projectWishedSong', () => {
  it('keeps the id, title and artist of a song and nothing else', () => {
    const song = { id: SONG_ID, title: 'Riff', artist: 'The Band', status: 'idea' };
    expect(projectWishedSong(song)).toStrictEqual({
      id: SONG_ID,
      title: 'Riff',
      artist: 'The Band',
    });
    expect(projectWishedSong(null)).toBeNull();
  });
});

describe('projectRegistrationList', () => {
  const registeredAt = new Date('2026-11-26T18:00:00Z');
  const members = [{ id: MEMBER_ID, firstName: 'Hugo' }];
  const songs = [{ id: SONG_ID, title: 'Riff', artist: 'The Band' }];

  it('names the member and the song a registration chose', () => {
    expect(
      projectRegistrationList(
        [
          {
            id: RANDOM_ID,
            firstName: 'Lou',
            email: 'lou@example.com',
            registeredAt,
            comingForMemberId: MEMBER_ID,
            wishedSongId: SONG_ID,
          },
        ],
        members,
        songs,
      ),
    ).toStrictEqual([
      {
        id: RANDOM_ID,
        firstName: 'Lou',
        email: 'lou@example.com',
        registeredAt: '2026-11-26T18:00:00.000Z',
        comingFor: { id: MEMBER_ID, firstName: 'Hugo' },
        wishedSong: { id: SONG_ID, title: 'Riff', artist: 'The Band' },
      },
    ]);
  });

  it('answers null for a registration that chose nothing or a member since removed', () => {
    const [entry] = projectRegistrationList(
      [
        {
          id: RANDOM_ID,
          firstName: 'Lou',
          email: 'lou@example.com',
          registeredAt,
          comingForMemberId: SESSION_ID,
          wishedSongId: null,
        },
      ],
      members,
      songs,
    );
    expect(entry?.comingFor).toBeNull();
    expect(entry?.wishedSong).toBeNull();
  });

  it('writes only the announcement fields a member changed, a null clearing one', () => {
    expect(toAnnouncementUpdate({})).toStrictEqual({});
    expect(
      toAnnouncementUpdate({
        message: null,
        posterS3Key: 'poster/a/b.png',
        prizeLabel: '3 bières',
        prizeIcon: 'gift',
      }),
    ).toStrictEqual({
      publicMessage: null,
      posterS3Key: 'poster/a/b.png',
      prizeLabel: '3 bières',
      prizeIcon: 'gift',
    });
  });
});
