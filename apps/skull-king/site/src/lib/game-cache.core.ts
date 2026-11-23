import { applyGameEdit, type GameEdit } from './game-edits.core';
import { type GameView, parseBroadcast } from './game-view.core';

export interface PendingEdit {
  readonly edit: GameEdit;
}

export interface GameCache {
  readonly server: GameView;
  readonly pending: readonly PendingEdit[];
}

function isNewerGame(cached: GameView, incoming: GameView): boolean {
  if (incoming.revision > cached.revision) return true;
  if (incoming.revision < cached.revision) return false;
  return Date.parse(incoming.readAt) >= Date.parse(cached.readAt);
}

/**
 * @Blueprint core-newest-view-wins
 * @BlueprintName Core Newest View Wins
 * @BlueprintUsage Use where the same whole record reaches the cache from several paths, a write's own answer, a broadcast and a read, in an order the network decides.
 * @BlueprintDescription Keeps the server's newest view whatever path brought it and whatever this phone is still sending, so no path is ever skipped. Newest is the higher `revision`, which every write to the record bumps inside its own transaction, so the order is the order the database committed the writes in rather than the order the requests started or any clock. Two views of one revision hold the same rows, and the one read later wins the tie. A cache with nothing yet takes whatever arrives. The edits this phone has not heard back about stay apart from the server's view and are laid over it to show the screen, so a broadcast from another phone lands at once and the tap still shows.
 */
export function receiveGame(cache: GameCache | undefined, incoming: GameView): GameCache {
  if (cache === undefined) return { server: incoming, pending: [] };
  return isNewerGame(cache.server, incoming) ? { ...cache, server: incoming } : cache;
}

export function receiveBroadcast(
  cache: GameCache | undefined,
  rawMessage: unknown,
  joinCode: string,
): GameCache | undefined {
  const incoming = parseBroadcast(rawMessage);
  if (incoming === null || incoming.joinCode !== joinCode) return cache;
  return receiveGame(cache, incoming);
}

export function addPendingEdit(
  cache: GameCache | undefined,
  pending: PendingEdit,
): GameCache | undefined {
  return cache === undefined ? undefined : { ...cache, pending: [...cache.pending, pending] };
}

export function dropPendingEdit(
  cache: GameCache | undefined,
  pending: PendingEdit,
): GameCache | undefined {
  return cache === undefined
    ? undefined
    : { ...cache, pending: cache.pending.filter((candidate) => candidate !== pending) };
}

export function selectShownGame(cache: GameCache): GameView {
  return cache.pending.reduce((game, pending) => applyGameEdit(game, pending.edit), cache.server);
}

export function readShownGame(cache: GameCache | undefined): GameView | undefined {
  return cache === undefined ? undefined : selectShownGame(cache);
}
