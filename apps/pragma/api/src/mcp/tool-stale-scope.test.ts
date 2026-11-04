import { describe, expect, it } from 'vitest';
import { selectToolStaleScope } from '../realtime/stale-scope.core';
import { ASSISTANT_TOOLS } from './mcp.controller';

const READ_TOOLS = [
  'find_sessions',
  'get_session',
  'list_setlists',
  'get_setlist',
  'find_songs',
  'get_song',
  'search_deezer',
  'list_takes',
  'get_take',
  'request_take_upload',
  'list_members',
  'list_instruments',
  'list_bars',
  'search_bar_places',
  'get_bar',
  'list_improvements',
  'list_tasks',
  'list_free_slots',
  'get_me',
];

// @FollowsBlueprint test-pure-unit
describe('which assistant tools tell the open tabs their data went stale', () => {
  it('treats exactly these tools as reads, read off the routes each tool serves', () => {
    const reads = ASSISTANT_TOOLS.filter((tool) => selectToolStaleScope(tool) === null).map(
      (tool) => tool.name,
    );
    expect(reads).toStrictEqual(READ_TOOLS);
  });

  it('sends every other tool as a change to everything', () => {
    const writes = ASSISTANT_TOOLS.filter((tool) => !READ_TOOLS.includes(tool.name));
    expect(writes.map(selectToolStaleScope)).toStrictEqual(writes.map(() => 'all'));
    expect(writes.map((tool) => tool.name)).toContain('reorder_setlist');
  });
});
