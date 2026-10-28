import {
  setlistCreateToolInputSchema,
  setlistEntriesAddToolInputSchema,
  setlistEntriesRemoveToolInputSchema,
  setlistEntryChangeToolInputSchema,
  setlistLinkToolInputSchema,
  setlistListToolInputSchema,
  setlistReferenceToolInputSchema,
  setlistRenameToolInputSchema,
  setlistReorderReferencesToolInputSchema,
  setlistSessionToolInputSchema,
  setlistVoteCastToolInputSchema,
  setlistVoteCloseToolInputSchema,
  setlistVoteStatusReferenceToolInputSchema,
} from './setlists.schema';
import {
  confirmUpdate,
  createSetlist,
  defineTool,
  patchEntry,
  removeSetlist,
  renameSetlist,
  type ToolAnswer,
} from './setlists.service';
import {
  appendSongs,
  buildEntryUpdate,
  getSetlistsForTool,
  readEntryTitlesInOrder,
  readSessionPlanForTool,
  readSetlistForTool,
  readVoteBoardForTool,
  removeEntriesAndCompact,
  reorderEntriesForTool,
  resolveEntryId,
  resolveEntryIds,
  resolveOptionalSessionId,
  resolveSessionId,
  resolveSetlistId,
  resolveSongId,
  resolveSongIds,
  setSessionLink,
} from './setlists-tools.service';
import { closeVote, scoreSong, setVoteStatus } from './voting.service';

const NOT_FOUND: ToolAnswer = { kind: 'refused', body: { error: 'not-found' } };
const NOT_VOTING: ToolAnswer = { kind: 'refused', body: { error: 'not-voting' } };
const NO_VOTES: ToolAnswer = { kind: 'refused', body: { error: 'no-votes' } };

// @FollowsBlueprint controller-dispatch
export const SETLIST_TOOLS = [
  defineTool({
    name: 'get_session',
    description:
      'Read one session with its setlists, their songs in order and who plays what. `session`: id, `next`, `next-concert`, `next-practice`, `last`, or a day YYYY-MM-DD.',
    routes: ['GET /api/sessions/:id', 'GET /api/setlists/by-session/:sessionId'],
    inputSchema: setlistSessionToolInputSchema,
    run: async ({ session }, actor) => {
      const plan = await readSessionPlanForTool(session, actor.now);
      if (plan === null) return NOT_FOUND;
      return { kind: 'answered', body: plan };
    },
  }),
  defineTool({
    name: 'list_setlists',
    description: 'List setlists with song counts and sessions, or only those of `session`.',
    routes: ['GET /api/setlists', 'GET /api/setlists/by-session/:sessionId'],
    inputSchema: setlistListToolInputSchema,
    run: async ({ session }, actor) => ({
      kind: 'answered',
      body: { setlists: await getSetlistsForTool(session, actor.now) },
    }),
  }),
  defineTool({
    name: 'get_setlist',
    description: 'Read a setlist by name or id with its songs in order and who plays what.',
    routes: ['GET /api/setlists/:id', 'GET /api/setlists/:id/entries'],
    inputSchema: setlistReferenceToolInputSchema,
    run: async ({ setlist }) => {
      const view = await readSetlistForTool(await resolveSetlistId(setlist));
      if (view === null) return NOT_FOUND;
      return { kind: 'answered', body: view };
    },
  }),
  defineTool({
    name: 'create_setlist',
    description:
      'Create a setlist, linked to `session` if given and filled with `songs` (titles or ids) in order.',
    routes: ['POST /api/setlists', 'POST /api/setlists/:id/entries'],
    inputSchema: setlistCreateToolInputSchema,
    run: async ({ name, session, songs }, actor) => {
      const sessionId = await resolveOptionalSessionId(session, actor.now);
      const songIds = await resolveSongIds(songs ?? []);
      const outcome = await createSetlist({ name, sessionId }, actor);
      if (outcome.kind === 'session-not-found') {
        return { kind: 'refused', body: { error: 'session-not-found' } };
      }
      await appendSongs(outcome.setlist.id, songIds, actor);
      return { kind: 'answered', body: { id: outcome.setlist.id, songs: songIds.length } };
    },
  }),
  defineTool({
    name: 'update_setlist',
    description: 'Rename a setlist. An audience choice setlist keeps its name.',
    routes: ['PUT /api/setlists/:id'],
    inputSchema: setlistRenameToolInputSchema,
    run: async ({ setlist, name }, actor) => {
      const id = await resolveSetlistId(setlist);
      const outcome = await renameSetlist(id, name, actor);
      if (outcome.kind === 'not-found') return NOT_FOUND;
      if (outcome.kind === 'not-renamable') {
        return { kind: 'refused', body: { error: 'setlist-not-renamable' } };
      }
      return { kind: 'answered', body: { id, name: outcome.setlist.name } };
    },
  }),
  defineTool({
    name: 'delete_setlist',
    description: 'Delete a setlist with its entries and its links to sessions.',
    routes: ['DELETE /api/setlists/:id'],
    inputSchema: setlistReferenceToolInputSchema,
    run: async ({ setlist }) => {
      const id = await resolveSetlistId(setlist);
      const outcome = await removeSetlist(id);
      if (outcome === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'link_setlist',
    description: 'Link a setlist at the end of a session, or remove that link with `unlink`.',
    routes: ['POST /api/setlists/:id/sessions', 'DELETE /api/setlists/:id/sessions/:sessionId'],
    inputSchema: setlistLinkToolInputSchema,
    run: async ({ setlist, session, unlink }, actor) => {
      const setlistId = await resolveSetlistId(setlist);
      const sessionId = await resolveSessionId(session, actor.now);
      const isUnlinking = unlink === true;
      const outcome = await setSessionLink(setlistId, sessionId, isUnlinking, actor);
      if (outcome.kind === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { setlistId, sessionId, linked: !isUnlinking } };
    },
  }),
  defineTool({
    name: 'add_setlist_entries',
    description: 'Add `songs` (titles or ids) at the end of a setlist, in order.',
    routes: ['POST /api/setlists/:id/entries'],
    inputSchema: setlistEntriesAddToolInputSchema,
    run: async ({ setlist, songs }, actor) => {
      const setlistId = await resolveSetlistId(setlist);
      const outcome = await appendSongs(setlistId, await resolveSongIds(songs), actor);
      if (outcome.kind === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { setlistId, entryIds: outcome.entryIds } };
    },
  }),
  defineTool({
    name: 'update_setlist_entry',
    description:
      'Change some fields of one entry, named by song title or entry id. `lineupOverride` maps members to instruments by name for this entry only; null goes back to the song lineup.',
    routes: ['PUT /api/setlists/:id/entries/:entryId'],
    inputSchema: setlistEntryChangeToolInputSchema,
    run: async ({ setlist, entry, lineupOverride, ...changes }, actor) => {
      const setlistId = await resolveSetlistId(setlist);
      const entryId = await resolveEntryId(setlistId, entry);
      const update = await buildEntryUpdate(changes, lineupOverride);
      const outcome = await patchEntry(setlistId, entryId, update, actor);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: confirmUpdate(entryId, update) };
    },
  }),
  defineTool({
    name: 'remove_setlist_entries',
    description: 'Remove entries (song titles or entry ids) from a setlist; the rest move up.',
    routes: ['DELETE /api/setlists/:id/entries/:entryId'],
    inputSchema: setlistEntriesRemoveToolInputSchema,
    run: async ({ setlist, entries }, actor) => {
      const setlistId = await resolveSetlistId(setlist);
      const entryIds = await resolveEntryIds(setlistId, entries);
      const outcome = await removeEntriesAndCompact(setlistId, entryIds, actor);
      if (outcome === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { setlistId, removed: entryIds.length } };
    },
  }),
  defineTool({
    name: 'reorder_setlist',
    description:
      'Reorder a setlist with one of `order` (every entry), `move` (one entry to a 1-based position) or `swap` (two entries); entries are song titles or entry ids. Answers the new order.',
    routes: ['PUT /api/setlists/:id/reorder'],
    inputSchema: setlistReorderReferencesToolInputSchema,
    run: async ({ setlist, ...references }, actor) => {
      const setlistId = await resolveSetlistId(setlist);
      const outcome = await reorderEntriesForTool(setlistId, references, actor);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return NOT_FOUND;
      if (outcome.kind === 'stale') return { kind: 'refused', body: { error: 'reorder-stale' } };
      return { kind: 'answered', body: { order: await readEntryTitlesInOrder(setlistId) } };
    },
  }),
  defineTool({
    name: 'get_vote_board',
    description:
      'Read the vote on a setlist: status, your points left, the tallies, and the songs closing now would keep.',
    routes: ['GET /api/setlists/:id/votes', 'GET /api/setlists/:id/closing-proposal'],
    inputSchema: setlistReferenceToolInputSchema,
    run: async ({ setlist }, actor) => {
      const outcome = await readVoteBoardForTool(await resolveSetlistId(setlist), actor.memberId);
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      return { kind: 'answered', body: outcome.board };
    },
  }),
  defineTool({
    name: 'set_vote_status',
    description:
      'Open (`voting`) or lock (`locked`) the vote on a setlist, with the number of songs to pick.',
    routes: ['PUT /api/setlists/:id/vote-status'],
    inputSchema: setlistVoteStatusReferenceToolInputSchema,
    run: async ({ setlist, status, targetSongCount }) => {
      const setlistId = await resolveSetlistId(setlist);
      const outcome = await setVoteStatus({ setlistId, status, targetSongCount });
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      return { kind: 'answered', body: { setlistId, status } };
    },
  }),
  defineTool({
    name: 'cast_vote',
    description: 'Give `points` to a song in the vote on a setlist, as you; 0 withdraws the vote.',
    routes: ['PUT /api/setlists/:id/votes/:songId'],
    inputSchema: setlistVoteCastToolInputSchema,
    run: async ({ setlist, song, points }, actor) => {
      const outcome = await scoreSong({
        setlistId: await resolveSetlistId(setlist),
        memberId: actor.memberId,
        songId: await resolveSongId(song),
        points,
        now: actor.now,
      });
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      if (outcome.kind === 'not-voting') return NOT_VOTING;
      if (outcome.kind === 'budget-exhausted') {
        return { kind: 'refused', body: { error: 'budget-exhausted', budget: outcome.budget } };
      }
      return { kind: 'answered', body: { points, remaining: outcome.budget.remaining } };
    },
  }),
  defineTool({
    name: 'close_vote',
    description: 'Close the vote on a setlist: its entries become `songs`, in order, and it locks.',
    routes: ['POST /api/setlists/:id/close'],
    inputSchema: setlistVoteCloseToolInputSchema,
    run: async ({ setlist, songs }) => {
      const setlistId = await resolveSetlistId(setlist);
      const outcome = await closeVote({ setlistId, songIds: await resolveSongIds(songs) });
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      if (outcome.kind === 'not-voting') return NOT_VOTING;
      if (outcome.kind === 'no-votes') return NO_VOTES;
      return { kind: 'answered', body: { setlistId, closed: true } };
    },
  }),
];
