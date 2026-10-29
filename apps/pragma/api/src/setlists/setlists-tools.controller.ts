import {
  setlistEntriesAddToolInputSchema,
  setlistEntriesRemoveToolInputSchema,
  setlistEntryChangeToolInputSchema,
  setlistLinkToolInputSchema,
  setlistListToolInputSchema,
  setlistReferenceToolInputSchema,
  setlistReorderReferencesToolInputSchema,
  setlistSaveToolInputSchema,
  setlistSessionToolInputSchema,
  setlistVoteCloseToolInputSchema,
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
  closeVoteForTool,
  defineDeletion,
  buildEntryUpdate,
  getSetlistsForTool,
  readEntryTitlesInOrder,
  readSessionPlanForTool,
  readSetlistForTool,
  refuseCreationOnlyFields,
  removeEntriesAndCompact,
  reorderEntriesForTool,
  resolveEntryId,
  resolveEntryIds,
  resolveOptionalSessionId,
  resolveSessionId,
  resolveSetlistId,
  resolveSongIds,
  setSessionLink,
  type ToolActor,
  type ToolVoteClosing,
} from './setlists-tools.service';

const NOT_FOUND: ToolAnswer = { kind: 'refused', body: { error: 'not-found' } };
const VOTE_CLOSING_REFUSALS: Readonly<Record<Exclude<ToolVoteClosing['kind'], 'ok'>, ToolAnswer>> =
  {
    'setlist-not-found': NOT_FOUND,
    'not-voting': { kind: 'refused', body: { error: 'not-voting' } },
    'no-votes': { kind: 'refused', body: { error: 'no-votes' } },
  };

interface SetlistCreation {
  readonly name: string | undefined;
  readonly session: string | undefined;
  readonly songs: readonly string[] | undefined;
}

async function runSetlistCreate(creation: SetlistCreation, actor: ToolActor): Promise<ToolAnswer> {
  const sessionId = await resolveOptionalSessionId(creation.session, actor.now);
  const songIds = await resolveSongIds(creation.songs ?? []);
  const outcome = await createSetlist({ name: creation.name ?? '', sessionId }, actor);
  if (outcome.kind === 'session-not-found') {
    return { kind: 'refused', body: { error: 'session-not-found' } };
  }
  await appendSongs(outcome.setlist.id, songIds, actor);
  return { kind: 'answered', body: { id: outcome.setlist.id, songs: songIds.length } };
}

async function runSetlistRename(
  reference: string,
  name: string | undefined,
  actor: ToolActor,
): Promise<ToolAnswer> {
  if (name === undefined) return { kind: 'refused', body: { error: 'empty-update' } };
  const id = await resolveSetlistId(reference);
  const outcome = await renameSetlist(id, name, actor);
  if (outcome.kind === 'not-found') return NOT_FOUND;
  if (outcome.kind === 'not-renamable') {
    return { kind: 'refused', body: { error: 'setlist-not-renamable' } };
  }
  return { kind: 'answered', body: confirmUpdate(id, { name }) };
}

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
    description:
      'Read a setlist by name or id with its songs in order, who plays what, and the comment on each transition into the next song.',
    routes: ['GET /api/setlists/:id', 'GET /api/setlists/:id/entries'],
    inputSchema: setlistReferenceToolInputSchema,
    run: async ({ setlist }) => {
      const view = await readSetlistForTool(await resolveSetlistId(setlist));
      if (view === null) return NOT_FOUND;
      return { kind: 'answered', body: view };
    },
  }),
  defineTool({
    name: 'save_setlist',
    description:
      'Create a setlist, linked to `session` if given and filled with `songs` (titles or ids) in order; or, with `setlist` (name or id), rename it. An audience choice setlist keeps its name.',
    routes: ['POST /api/setlists', 'POST /api/setlists/:id/entries', 'PUT /api/setlists/:id'],
    inputSchema: setlistSaveToolInputSchema,
    run: async ({ setlist, name, session, songs }, actor) => {
      if (setlist === undefined) return await runSetlistCreate({ name, session, songs }, actor);
      refuseCreationOnlyFields({ session, songs });
      return await runSetlistRename(setlist, name, actor);
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
    name: 'close_setlist_vote',
    description:
      'Close the vote on a setlist and lock it. With `songs` (titles or ids, in order) the setlist becomes those songs; without, it keeps its songs.',
    routes: ['PUT /api/setlists/:id/vote-status', 'POST /api/setlists/:id/close'],
    inputSchema: setlistVoteCloseToolInputSchema,
    run: async ({ setlist, songs }) => {
      const setlistId = await resolveSetlistId(setlist);
      const outcome = await closeVoteForTool(setlistId, songs);
      if (outcome.kind !== 'ok') return VOTE_CLOSING_REFUSALS[outcome.kind];
      return { kind: 'answered', body: { setlistId, status: 'locked' } };
    },
  }),
];

export const SETLIST_DELETION = defineDeletion({
  route: 'DELETE /api/setlists/:id',
  remove: async (reference) => {
    const id = await resolveSetlistId(reference);
    const outcome = await removeSetlist(id);
    if (outcome === 'not-found') return NOT_FOUND;
    return { kind: 'answered', body: { id, deleted: true } };
  },
});
