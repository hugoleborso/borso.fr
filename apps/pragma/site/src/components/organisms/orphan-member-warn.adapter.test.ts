/**
 * The module owns a Set that lives as long as the page does, so each test
 * imports the module fresh — a warning already emitted in an earlier test
 * would otherwise be silently swallowed in the next one, which is exactly the
 * behaviour under test.
 */

import { describe, expect, it, vi } from 'vitest';

type Warner = typeof import('./orphan-member-warn.adapter').warnIfOrphanMemberIds;

async function freshWarner(): Promise<Warner> {
  vi.resetModules();
  const module = await import('./orphan-member-warn.adapter');
  return module.warnIfOrphanMemberIds;
}

function watchConsole(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}

describe('warnIfOrphanMemberIds', () => {
  it('says nothing when every member in the lineup is known', async () => {
    const warn = watchConsole();
    const warnIfOrphanMemberIds = await freshWarner();
    warnIfOrphanMemberIds({ 'member-1': ['guitar'] }, new Set(['member-1']), 'song-1');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('names the member, the song and the surface for an id that survived a scrub', async () => {
    const warn = watchConsole();
    const warnIfOrphanMemberIds = await freshWarner();
    warnIfOrphanMemberIds({ 'member-gone': ['bass'] }, new Set(['member-1']), 'song-7');
    expect(warn).toHaveBeenCalledWith({
      surface: 'lineup-resolver',
      orphanMemberId: 'member-gone',
      songId: 'song-7',
    });
    warn.mockRestore();
  });

  it('says it once per orphan however often the editor re-renders', async () => {
    const warn = watchConsole();
    const warnIfOrphanMemberIds = await freshWarner();
    const known = new Set(['member-1']);
    warnIfOrphanMemberIds({ 'member-gone': ['bass'] }, known, 'song-7');
    warnIfOrphanMemberIds({ 'member-gone': ['bass'] }, known, 'song-7');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('still reports a second orphan the first pass had not seen', async () => {
    const warn = watchConsole();
    const warnIfOrphanMemberIds = await freshWarner();
    const known = new Set(['member-1']);
    warnIfOrphanMemberIds({ 'member-gone': ['bass'] }, known, 'song-7');
    warnIfOrphanMemberIds({ 'member-also-gone': ['keys'] }, known, 'song-7');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
