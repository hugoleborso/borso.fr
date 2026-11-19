import { randomUUID } from 'node:crypto';
import { createInspiration } from '../inspirations/inspirations.service';
import {
  createMember,
  getMembersSortedByFirstName,
  removeMember,
} from '../members/members.service';
import { createSession } from '../sessions/sessions.service';
import { appendEntry } from '../setlists/setlist-entry.service';
import { createSetlist } from '../setlists/setlists.service';
import { getSongs } from '../songs/songs.service';
import {
  BLANK_ENTRY_DETAIL,
  SEED_FORMER_MEMBER,
  SEED_FORMER_MEMBER_INSPIRATION,
  SEED_TODAY_PRACTICE,
} from './test-seed-fixture.core';

// @FollowsBlueprint service-orchestration
export async function seedFormerMemberInspiration(now: Date): Promise<void> {
  const formerMember = await createMember(SEED_FORMER_MEMBER);
  await createInspiration(
    { id: randomUUID(), ...SEED_FORMER_MEMBER_INSPIRATION },
    { memberId: formerMember.id, now },
  );
  await removeMember(formerMember.id);
}

// @FollowsBlueprint service-orchestration
export async function seedTodayPractice(now: Date): Promise<void> {
  const [member] = await getMembersSortedByFirstName();
  if (member === undefined) throw new Error('the seeded practice has no member to act as');
  const actor = { memberId: member.id, now };
  const songIdByTitle = new Map((await getSongs()).map((song) => [song.title, song.id]));
  const practice = await createSession(
    { kind: 'practice', date: now.toISOString(), preparedConcertId: null, origin: null },
    actor,
  );
  const created = await createSetlist(
    { name: SEED_TODAY_PRACTICE.setlistName, sessionId: practice.id },
    actor,
  );
  if (created.kind === 'session-not-found')
    throw new Error('seeded practice vanished before its setlist was written');
  for (const title of SEED_TODAY_PRACTICE.songTitles) {
    const songId = songIdByTitle.get(title);
    if (songId === undefined) throw new Error(`the seeded practice names no seeded song ${title}`);
    await appendEntry(
      created.setlist.id,
      { songId, energy: null, lineupOverride: null, ...BLANK_ENTRY_DETAIL },
      actor,
    );
  }
}
