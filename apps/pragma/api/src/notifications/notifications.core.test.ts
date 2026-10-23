import { describe, expect, it } from 'vitest';
import {
  buildCategoryToggles,
  buildGroupKey,
  buildNotificationPayload,
  buildNotificationUrl,
  classifyPushFailure,
  countDelivered,
  isCategoryEnabled,
  isConflictAbort,
  isGroupDue,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_GROUP_WINDOW_MINUTES,
  type NotificationEvent,
  type PushDeliveryOutcome,
  readPushFailureStatus,
  selectCategory,
  selectExpiredEndpoints,
  selectFailureReports,
  selectRecipients,
} from './notifications.core';

const ACTOR = 'member-hugo';
const OTHER = 'member-lea';
const THIRD = 'member-sam';

const TAKE_CREATED: NotificationEvent = {
  kind: 'take-created',
  actorMemberId: ACTOR,
  takeId: 'take-1',
  songId: 'song-1',
  songTitle: 'Seven Nation Army',
};
const TAKE_COMMENT_CREATED: NotificationEvent = { ...TAKE_CREATED, kind: 'take-comment-created' };
const SESSION_CREATED: NotificationEvent = {
  kind: 'session-created',
  actorMemberId: ACTOR,
  sessionId: 'session-1',
  sessionDate: '2026-10-30T18:00:00.000Z',
};
const SESSION_CHANGED: NotificationEvent = { ...SESSION_CREATED, kind: 'session-changed' };
const SETLIST_CHANGED: NotificationEvent = {
  kind: 'setlist-changed',
  actorMemberId: ACTOR,
  setlistId: 'setlist-1',
  setlistName: 'Fête de la musique',
};
const SONG_LINEUP_CHANGED: NotificationEvent = {
  kind: 'song-lineup-changed',
  actorMemberId: ACTOR,
  songId: 'song-2',
  songTitle: 'Valerie',
};
const TRANSITION_CHANGED: NotificationEvent = {
  kind: 'transition-changed',
  actorMemberId: ACTOR,
  songAId: 'song-a',
  songATitle: 'Valerie',
  songBId: 'song-b',
  songBTitle: 'Rehab',
};

const DELIVERED: PushDeliveryOutcome = { delivery: 'delivered', statusCode: null };
const EXPIRED: PushDeliveryOutcome = { delivery: 'expired', statusCode: 410 };
const FAILED: PushDeliveryOutcome = { delivery: 'failed', statusCode: 500 };

// @FollowsBlueprint test-pure-unit
describe('classifyPushFailure', () => {
  it('reads a gone or unknown subscription as expired', () => {
    expect(classifyPushFailure({ statusCode: 410 })).toBe('expired');
    expect(classifyPushFailure({ statusCode: 404 })).toBe('expired');
  });

  it('reads any other failure as a failure', () => {
    expect(classifyPushFailure({ statusCode: 500 })).toBe('failed');
    expect(classifyPushFailure({ statusCode: 403 })).toBe('failed');
    expect(classifyPushFailure(new Error('network'))).toBe('failed');
  });
});

describe('readPushFailureStatus', () => {
  it('reads the status a push service answered, or none', () => {
    expect(readPushFailureStatus({ statusCode: 429 })).toBe(429);
    expect(readPushFailureStatus(new Error('socket hang up'))).toBeNull();
  });
});

describe('selectExpiredEndpoints', () => {
  it('keeps the endpoints whose delivery says the subscription expired', () => {
    expect(
      selectExpiredEndpoints(
        [{ endpoint: 'a' }, { endpoint: 'b' }, { endpoint: 'c' }],
        [DELIVERED, EXPIRED, FAILED],
      ),
    ).toEqual(['b']);
  });

  it('keeps nothing for a target with no outcome', () => {
    expect(selectExpiredEndpoints([{ endpoint: 'a' }], [])).toEqual([]);
  });
});

describe('selectFailureReports', () => {
  it('reports the host and status of each failure, never an expiry', () => {
    expect(
      selectFailureReports(
        [
          { endpoint: 'https://web.push.apple.com/a' },
          { endpoint: 'https://fcm.googleapis.com/b' },
          { endpoint: 'https://updates.push.services.mozilla.com/c' },
        ],
        [FAILED, EXPIRED, { delivery: 'failed', statusCode: null }],
      ),
    ).toEqual([
      { host: 'web.push.apple.com', statusCode: 500 },
      { host: 'updates.push.services.mozilla.com', statusCode: null },
    ]);
  });

  it('reports nothing for a target with no outcome', () => {
    expect(selectFailureReports([{ endpoint: 'https://p.example/a' }], [])).toEqual([]);
  });
});

describe('countDelivered', () => {
  it('counts the delivered pushes only', () => {
    expect(countDelivered([DELIVERED, EXPIRED, FAILED, DELIVERED, FAILED])).toBe(2);
  });
});

describe('selectCategory', () => {
  it.each([
    [TAKE_CREATED, 'takes'],
    [TAKE_COMMENT_CREATED, 'take_comments'],
    [SESSION_CREATED, 'sessions'],
    [SESSION_CHANGED, 'sessions'],
    [SETLIST_CHANGED, 'setlists'],
    [SONG_LINEUP_CHANGED, 'setlists'],
    [TRANSITION_CHANGED, 'setlists'],
  ] as const)('files %o under %s', (event, category) => {
    expect(selectCategory(event)).toBe(category);
  });
});

describe('isCategoryEnabled', () => {
  it('reads a missing preference as enabled', () => {
    expect(isCategoryEnabled([], 'takes')).toBe(true);
  });

  it('reads the stored toggle of that category', () => {
    const preferences = [
      { memberId: OTHER, category: 'takes', enabled: false },
      { memberId: OTHER, category: 'sessions', enabled: true },
    ];
    expect(isCategoryEnabled(preferences, 'takes')).toBe(false);
    expect(isCategoryEnabled(preferences, 'sessions')).toBe(true);
    expect(isCategoryEnabled(preferences, 'setlists')).toBe(true);
  });
});

describe('buildCategoryToggles', () => {
  it('answers every category in a fixed order, on unless turned off', () => {
    expect(
      buildCategoryToggles([{ memberId: OTHER, category: 'sessions', enabled: false }]),
    ).toEqual([
      { category: 'takes', enabled: true },
      { category: 'take_comments', enabled: true },
      { category: 'sessions', enabled: false },
      { category: 'setlists', enabled: true },
    ]);
    expect(NOTIFICATION_CATEGORIES).toEqual(['takes', 'take_comments', 'sessions', 'setlists']);
  });
});

describe('selectRecipients', () => {
  const subscriptions = [
    { memberId: ACTOR, endpoint: 'actor-phone' },
    { memberId: OTHER, endpoint: 'lea-phone' },
    { memberId: OTHER, endpoint: 'lea-laptop' },
    { memberId: THIRD, endpoint: 'sam-phone' },
  ];

  it('sends once per subscription of every member but the actor', () => {
    expect(
      selectRecipients(subscriptions, [], { actorMemberId: ACTOR, category: 'takes' }).map(
        (subscription) => subscription.endpoint,
      ),
    ).toEqual(['lea-phone', 'lea-laptop', 'sam-phone']);
  });

  it('skips a member who turned the category off, and only for that category', () => {
    const preferences = [{ memberId: THIRD, category: 'takes', enabled: false }];
    expect(
      selectRecipients(subscriptions, preferences, {
        actorMemberId: ACTOR,
        category: 'takes',
      }).map((subscription) => subscription.endpoint),
    ).toEqual(['lea-phone', 'lea-laptop']);
    expect(
      selectRecipients(subscriptions, preferences, {
        actorMemberId: ACTOR,
        category: 'sessions',
      }).map((subscription) => subscription.endpoint),
    ).toEqual(['lea-phone', 'lea-laptop', 'sam-phone']);
  });

  it("never reads another member's toggle", () => {
    const preferences = [{ memberId: OTHER, category: 'takes', enabled: false }];
    expect(
      selectRecipients(subscriptions, preferences, {
        actorMemberId: ACTOR,
        category: 'takes',
      }).map((subscription) => subscription.endpoint),
    ).toEqual(['sam-phone']);
  });
});

describe('buildGroupKey', () => {
  it.each([
    [TAKE_CREATED, 'take:take-1'],
    [TAKE_COMMENT_CREATED, 'take-comment:take-1'],
    [SESSION_CREATED, 'session:session-1'],
    [SESSION_CHANGED, 'session:session-1'],
    [SETLIST_CHANGED, 'setlist:setlist-1'],
    [SONG_LINEUP_CHANGED, 'song-lineup:song-2'],
    [TRANSITION_CHANGED, 'transition:song-a:song-b'],
  ] as const)('groups %o under %s', (event, groupKey) => {
    expect(buildGroupKey(event)).toBe(groupKey);
  });
});

describe('isGroupDue', () => {
  const lastSentAt = new Date('2026-10-23T20:00:00.000Z');

  it('sends a group that never sent', () => {
    expect(isGroupDue(null, lastSentAt)).toBe(true);
  });

  it('holds a group inside its window and sends it once the window has passed', () => {
    expect(NOTIFICATION_GROUP_WINDOW_MINUTES).toBe(10);
    expect(isGroupDue(lastSentAt, new Date('2026-10-23T20:09:59.999Z'))).toBe(false);
    expect(isGroupDue(lastSentAt, new Date('2026-10-23T20:10:00.000Z'))).toBe(true);
  });
});

describe('buildNotificationUrl', () => {
  it.each([
    [TAKE_CREATED, '/catalog/song-1?take=take-1'],
    [TAKE_COMMENT_CREATED, '/catalog/song-1?take=take-1'],
    [SESSION_CREATED, '/sessions/session-1'],
    [SESSION_CHANGED, '/sessions/session-1'],
    [SETLIST_CHANGED, '/setlists/setlist-1'],
    [SONG_LINEUP_CHANGED, '/catalog/song-2'],
    [TRANSITION_CHANGED, '/catalog/song-a'],
  ] as const)('opens %o at %s', (event, url) => {
    expect(buildNotificationUrl(event)).toBe(url);
  });
});

describe('buildNotificationPayload', () => {
  it('carries the message key, its parameters, the address and the group as tag', () => {
    expect(buildNotificationPayload(TAKE_CREATED, 'Hugo')).toEqual({
      messageKey: 'take-created',
      parameters: { actorName: 'Hugo', songTitle: 'Seven Nation Army' },
      url: '/catalog/song-1?take=take-1',
      tag: 'take:take-1',
    });
  });

  it('leaves the actor out when the member is gone', () => {
    expect(buildNotificationPayload(SETLIST_CHANGED, null)).toEqual({
      messageKey: 'setlist-changed',
      parameters: { setlistName: 'Fête de la musique' },
      url: '/setlists/setlist-1',
      tag: 'setlist:setlist-1',
    });
  });

  it.each([
    [TAKE_COMMENT_CREATED, { songTitle: 'Seven Nation Army' }],
    [SESSION_CREATED, { sessionDate: '2026-10-30T18:00:00.000Z' }],
    [SESSION_CHANGED, { sessionDate: '2026-10-30T18:00:00.000Z' }],
    [SONG_LINEUP_CHANGED, { songTitle: 'Valerie' }],
    [TRANSITION_CHANGED, { songATitle: 'Valerie', songBTitle: 'Rehab' }],
  ] as const)('names the subject of %o', (event, parameters) => {
    expect(buildNotificationPayload(event, 'Léa').parameters).toEqual({
      actorName: 'Léa',
      ...parameters,
    });
  });
});

describe('isConflictAbort', () => {
  it('reads a DSQL or Postgres serialization failure as a conflict', () => {
    expect(isConflictAbort({ code: 'OC000' })).toBe(true);
    expect(isConflictAbort({ code: '40001' })).toBe(true);
    expect(isConflictAbort({ message: 'wrapped', cause: { code: 'OC000' } })).toBe(true);
    expect(isConflictAbort({ cause: { code: '40001' } })).toBe(true);
  });

  it('reads anything else as a real failure', () => {
    expect(isConflictAbort({ code: '23505' })).toBe(false);
    expect(isConflictAbort({ code: '23505', cause: { code: 'OC000' } })).toBe(false);
    expect(isConflictAbort({ cause: { code: '23505' } })).toBe(false);
    expect(isConflictAbort({ cause: new Error('no code') })).toBe(false);
    expect(isConflictAbort(new Error('timeout'))).toBe(false);
    expect(isConflictAbort('OC000')).toBe(false);
  });
});
