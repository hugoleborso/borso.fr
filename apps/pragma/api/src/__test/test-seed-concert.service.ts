import { patchAnnouncement } from '../concert-registrations/concert-registrations.service';
import type { WriteActor } from '../notifications/notifications.service';
import { MILLISECONDS_PER_DAY } from '../oauth/oauth.core';
import { createSession } from '../sessions/sessions.service';
import { appendEntry } from '../setlists/setlist-entry.service';
import { createSetlist } from '../setlists/setlists.service';
import { BLANK_ENTRY_DETAIL, SEED_SONGS } from './test-seed-fixture.core';

const CONCERT_DAYS_FROM_NOW = 7;
const CONCERT_CAPACITY = 120;
const CONCERT_VENUE = 'Le Petit Bain';
const CONCERT_PUBLIC_MESSAGE = 'Portes à 20 h, premier morceau à 20 h 30.';
const SEED_SETLIST_NAME = 'Set principal';

// @FollowsBlueprint service-orchestration
export async function seedConcertSetlist(
  songIds: readonly string[],
  actor: WriteActor,
): Promise<string> {
  const now = actor.now;
  const concertDate = new Date(now.getTime() + CONCERT_DAYS_FROM_NOW * MILLISECONDS_PER_DAY);
  const concert = await createSession(
    {
      kind: 'concert',
      date: concertDate.toISOString(),
      venue: CONCERT_VENUE,
      capacity: CONCERT_CAPACITY,
      friendsCountPerMember: {},
    },
    actor,
  );
  const created = await createSetlist({ name: SEED_SETLIST_NAME, sessionId: concert.id }, actor);
  if (created.kind === 'session-not-found')
    throw new Error('seeded concert vanished before its setlist was written');
  await patchAnnouncement({ sessionId: concert.id, message: CONCERT_PUBLIC_MESSAGE, now });
  for (const [index, songId] of songIds.entries()) {
    const detail = SEED_SONGS[index]?.entry ?? BLANK_ENTRY_DETAIL;
    await appendEntry(
      created.setlist.id,
      {
        songId,
        energy: null,
        lineupOverride: null,
        keyOverride: detail.keyOverride,
        capo: detail.capo,
        notes: detail.notes,
      },
      actor,
    );
  }
  return concert.id;
}
