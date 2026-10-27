import { z } from 'zod';
import {
  setlistBySessionParamSchema,
  setlistCloseToolInputSchema,
  setlistCreateSchema,
  setlistEntryCreateToolInputSchema,
  setlistEntryIdParamSchema,
  setlistEntryLineupToolInputSchema,
  setlistEntryUpdateToolInputSchema,
  setlistIdParamSchema,
  setlistLinkToolInputSchema,
  setlistRenameToolInputSchema,
  setlistReorderToolInputSchema,
  setlistSessionParamSchema,
  setlistVoteScoreToolInputSchema,
  setlistVoteStatusToolInputSchema,
  type SetlistEntryPersistedUpdate,
} from './setlists.schema';
import {
  appendEntry,
  createSetlist,
  defineTool,
  findSetlist,
  getAllSetlists,
  getEntries,
  getSetlistsOfSession,
  linkSetlistToSession,
  patchEntry,
  removeEntryAndCompact,
  removeSetlist,
  renameSetlist,
  reorderEntries,
  type ToolActor,
  type ToolAnswer,
  unlinkSetlistFromSession,
} from './setlists.service';
import {
  closeVote,
  readClosingProposal,
  readVoteBoard,
  scoreSong,
  setVoteStatus,
} from './voting.service';

const NOT_FOUND: ToolAnswer = { kind: 'refused', body: { error: 'not-found' } };
const NOT_VOTING: ToolAnswer = { kind: 'refused', body: { error: 'not-voting' } };
const NO_VOTES: ToolAnswer = { kind: 'refused', body: { error: 'no-votes' } };
const VOTE_ACCEPTED: ToolAnswer = { kind: 'answered', body: { ok: true } };

async function runEntryUpdate(
  setlistId: string,
  entryId: string,
  input: SetlistEntryPersistedUpdate,
  actor: ToolActor,
): Promise<ToolAnswer> {
  const outcome = await patchEntry(setlistId, entryId, input, actor);
  if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
  if (outcome.kind === 'not-found') return NOT_FOUND;
  return { kind: 'answered', body: { entry: outcome.entry } };
}

// @FollowsBlueprint controller-dispatch
export const SETLIST_TOOLS = [
  defineTool({
    name: 'list_setlists',
    description: 'List every setlist with its song count and the sessions it is linked to.',
    route: 'GET /api/setlists',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { setlists: await getAllSetlists() } }),
  }),
  defineTool({
    name: 'list_session_setlists',
    description: 'List the setlists linked to the session `sessionId`, in their order.',
    route: 'GET /api/setlists/by-session/:sessionId',
    inputSchema: setlistBySessionParamSchema,
    run: async ({ sessionId }) => ({
      kind: 'answered',
      body: { setlists: await getSetlistsOfSession(sessionId) },
    }),
  }),
  defineTool({
    name: 'get_setlist',
    description: 'Read one setlist by its id; `list_setlist_entries` reads its songs.',
    route: 'GET /api/setlists/:id',
    inputSchema: setlistIdParamSchema,
    run: async ({ id }) => {
      const setlist = await findSetlist(id);
      if (setlist === null) return NOT_FOUND;
      return { kind: 'answered', body: { setlist } };
    },
  }),
  defineTool({
    name: 'create_setlist',
    description: 'Create an empty setlist, linked at the end of the session `sessionId` if given.',
    route: 'POST /api/setlists',
    inputSchema: setlistCreateSchema,
    run: async (input, actor) => {
      const outcome = await createSetlist(input, actor);
      if (outcome.kind === 'session-not-found') {
        return { kind: 'refused', body: { error: 'session-not-found' } };
      }
      return { kind: 'answered', body: { setlist: outcome.setlist } };
    },
  }),
  defineTool({
    name: 'update_setlist',
    description: 'Rename the setlist `id`. An audience choice setlist keeps its name.',
    route: 'PUT /api/setlists/:id',
    inputSchema: setlistRenameToolInputSchema,
    run: async ({ id, name }, actor) => {
      const outcome = await renameSetlist(id, name, actor);
      if (outcome.kind === 'not-found') return NOT_FOUND;
      if (outcome.kind === 'not-renamable') {
        return { kind: 'refused', body: { error: 'setlist-not-renamable' } };
      }
      return { kind: 'answered', body: { setlist: outcome.setlist } };
    },
  }),
  defineTool({
    name: 'delete_setlist',
    description: 'Delete a setlist with its entries and its links to sessions.',
    route: 'DELETE /api/setlists/:id',
    inputSchema: setlistIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeSetlist(id);
      if (outcome === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'link_setlist_to_session',
    description: 'Link the setlist `id` at the end of the session `sessionId`.',
    route: 'POST /api/setlists/:id/sessions',
    inputSchema: setlistLinkToolInputSchema,
    run: async ({ id, sessionId }, actor) => {
      const outcome = await linkSetlistToSession(id, sessionId, actor);
      if (outcome.kind === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { setlistId: id, sessionId } };
    },
  }),
  defineTool({
    name: 'unlink_setlist_from_session',
    description: 'Remove the link between the setlist `id` and the session `sessionId`.',
    route: 'DELETE /api/setlists/:id/sessions/:sessionId',
    inputSchema: setlistSessionParamSchema,
    run: async ({ id, sessionId }, actor) => {
      const outcome = await unlinkSetlistFromSession(id, sessionId, actor);
      if (outcome === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { setlistId: id, sessionId, unlinked: true } };
    },
  }),
  defineTool({
    name: 'list_setlist_entries',
    description: 'List the entries (songs) of the setlist `id`, in their order.',
    route: 'GET /api/setlists/:id/entries',
    inputSchema: setlistIdParamSchema,
    run: async ({ id }) => ({ kind: 'answered', body: { entries: await getEntries(id) } }),
  }),
  defineTool({
    name: 'add_setlist_entry',
    description: 'Add the song `songId` at the end of the setlist `id`.',
    route: 'POST /api/setlists/:id/entries',
    inputSchema: setlistEntryCreateToolInputSchema,
    run: async ({ id, ...input }, actor) => {
      const outcome = await appendEntry(id, input, actor);
      if (outcome.kind === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { entry: outcome.entry } };
    },
  }),
  defineTool({
    name: 'update_setlist_entry',
    description:
      'Change some fields of the entry `entryId` of the setlist `id`; fields left out keep their value.',
    route: 'PUT /api/setlists/:id/entries/:entryId',
    inputSchema: setlistEntryUpdateToolInputSchema,
    run: async ({ id, entryId, ...input }, actor) =>
      await runEntryUpdate(id, entryId, input, actor),
  }),
  defineTool({
    name: 'set_entry_lineup',
    description:
      "Override the song's default lineup for one entry: a map from member id to the instrument id, or instrument ids, that member plays; null goes back to the default lineup.",
    route: 'PUT /api/setlists/:id/entries/:entryId',
    inputSchema: setlistEntryLineupToolInputSchema,
    run: async ({ id, entryId, lineupOverride }, actor) =>
      await runEntryUpdate(id, entryId, { lineupOverride }, actor),
  }),
  defineTool({
    name: 'remove_setlist_entry',
    description: 'Remove the entry `entryId` from the setlist `id`; the entries after it move up.',
    route: 'DELETE /api/setlists/:id/entries/:entryId',
    inputSchema: setlistEntryIdParamSchema,
    run: async ({ id, entryId }, actor) => {
      const outcome = await removeEntryAndCompact(id, entryId, actor);
      if (outcome === 'not-found') return NOT_FOUND;
      return { kind: 'answered', body: { id: entryId, deleted: true } };
    },
  }),
  defineTool({
    name: 'move_setlist_entry',
    description:
      'Reorder the setlist `id`: `entryIds` lists every entry id of the setlist, once each, in the new order.',
    route: 'PUT /api/setlists/:id/reorder',
    inputSchema: setlistReorderToolInputSchema,
    run: async ({ id, entryIds }, actor) => {
      const outcome = await reorderEntries(id, entryIds, actor);
      if (outcome.kind === 'not-found') return NOT_FOUND;
      if (outcome.kind === 'stale') return { kind: 'refused', body: { error: 'reorder-stale' } };
      return { kind: 'answered', body: { id, entryIds } };
    },
  }),
  defineTool({
    name: 'get_vote_board',
    description:
      'Read the audience vote on the setlist `id`: its status, the points the member has left, and the tallies.',
    route: 'GET /api/setlists/:id/votes',
    inputSchema: setlistIdParamSchema,
    run: async ({ id }, actor) => {
      const outcome = await readVoteBoard(id, actor.memberId);
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      return { kind: 'answered', body: outcome.board };
    },
  }),
  defineTool({
    name: 'set_vote_status',
    description:
      'Open (`voting`) or lock (`locked`) the vote on the setlist `id`, with the number of songs to pick.',
    route: 'PUT /api/setlists/:id/vote-status',
    inputSchema: setlistVoteStatusToolInputSchema,
    run: async ({ id, status, targetSongCount }) => {
      const outcome = await setVoteStatus({ setlistId: id, status, targetSongCount });
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      return VOTE_ACCEPTED;
    },
  }),
  defineTool({
    name: 'cast_vote',
    description:
      "Give `points` to the song `songId` in the setlist `id`'s vote, as the member; 0 withdraws the vote.",
    route: 'PUT /api/setlists/:id/votes/:songId',
    inputSchema: setlistVoteScoreToolInputSchema,
    run: async ({ id, songId, points }, actor) => {
      const outcome = await scoreSong({
        setlistId: id,
        memberId: actor.memberId,
        songId,
        points,
        now: actor.now,
      });
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      if (outcome.kind === 'not-voting') return NOT_VOTING;
      if (outcome.kind === 'budget-exhausted') {
        return { kind: 'refused', body: { error: 'budget-exhausted', budget: outcome.budget } };
      }
      return { kind: 'answered', body: { budget: outcome.budget, songId, points } };
    },
  }),
  defineTool({
    name: 'get_closing_proposal',
    description: 'Read the songs the vote on the setlist `id` would keep if it closed now.',
    route: 'GET /api/setlists/:id/closing-proposal',
    inputSchema: setlistIdParamSchema,
    run: async ({ id }) => {
      const outcome = await readClosingProposal(id);
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      if (outcome.kind === 'not-voting') return NOT_VOTING;
      if (outcome.kind === 'no-votes') return NO_VOTES;
      return { kind: 'answered', body: { tallies: outcome.tallies } };
    },
  }),
  defineTool({
    name: 'close_vote',
    description:
      'Close the vote on the setlist `id`: its entries become `songIds`, in that order, and the setlist locks.',
    route: 'POST /api/setlists/:id/close',
    inputSchema: setlistCloseToolInputSchema,
    run: async ({ id, songIds }) => {
      const outcome = await closeVote({ setlistId: id, songIds });
      if (outcome.kind === 'setlist-not-found') return NOT_FOUND;
      if (outcome.kind === 'not-voting') return NOT_VOTING;
      if (outcome.kind === 'no-votes') return NO_VOTES;
      return VOTE_ACCEPTED;
    },
  }),
];
