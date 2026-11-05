import { describe, expect, it } from 'vitest';
import { selectToolWrittenRoots } from '../realtime/stale-scope.core';
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

function getTool(name: string): { readonly routes: readonly string[] } {
  const tool = ASSISTANT_TOOLS.find((candidate) => candidate.name === name);
  if (tool === undefined) throw new Error(`no assistant tool named ${name}`);
  return tool;
}

// @FollowsBlueprint test-pure-unit
describe('which roots an assistant tool tells the open tabs it wrote', () => {
  it('treats exactly these tools as reads, read off the routes each tool serves', () => {
    const reads = ASSISTANT_TOOLS.filter((tool) => selectToolWrittenRoots(tool).length === 0).map(
      (tool) => tool.name,
    );
    expect(reads).toStrictEqual(READ_TOOLS);
  });

  it('sends the roots of a writing tool’s own routes, never everything', () => {
    expect(selectToolWrittenRoots(getTool('reorder_setlist'))).toStrictEqual(['setlists']);
    expect(selectToolWrittenRoots(getTool('save_task'))).toStrictEqual(['tasks']);
    expect(selectToolWrittenRoots(getTool('set_song_mastery'))).not.toContain('all');
  });
});
