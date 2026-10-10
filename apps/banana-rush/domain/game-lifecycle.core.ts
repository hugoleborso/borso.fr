import { MINIMUM_SEATS } from './game-setup.core';

export const GAME_STATUSES = ['lobby', 'playing', 'finished'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

const NO_FREE_SEATS = 0;

export type StartRefusal = 'not-in-lobby' | 'not-enough-players';

export type ViewerMove = 'join' | 'start' | 'bid' | 'rematch';

export interface TableSeat {
  readonly id: string;
  readonly isHost: boolean;
}

export interface TableForViewer {
  readonly status: GameStatus;
  readonly players: readonly TableSeat[];
  readonly viewerId: string | null;
  readonly viewerBid: number | null;
  readonly freeSeats: number;
  readonly rematchJoinCode: string | null;
}

// @FollowsBlueprint domain-shared-selection
export function refuseStart(status: GameStatus, playerCount: number): StartRefusal | null {
  if (status !== 'lobby') return 'not-in-lobby';
  if (playerCount < MINIMUM_SEATS) return 'not-enough-players';
  return null;
}

function isViewerHost(table: TableForViewer): boolean {
  return table.players.some((player) => player.id === table.viewerId && player.isHost);
}

function isViewerSeated(table: TableForViewer): boolean {
  return table.players.some((player) => player.id === table.viewerId);
}

function canJoin(table: TableForViewer): boolean {
  return !isViewerSeated(table) && table.status === 'lobby' && table.freeSeats > NO_FREE_SEATS;
}

function canStart(table: TableForViewer): boolean {
  return isViewerHost(table) && refuseStart(table.status, table.players.length) === null;
}

function canBid(table: TableForViewer): boolean {
  return isViewerSeated(table) && table.status === 'playing' && table.viewerBid === null;
}

function canAskForRematch(table: TableForViewer): boolean {
  return isViewerHost(table) && table.status === 'finished' && table.rematchJoinCode === null;
}

const MOVE_RULES: readonly (readonly [ViewerMove, (table: TableForViewer) => boolean])[] = [
  ['join', canJoin],
  ['start', canStart],
  ['bid', canBid],
  ['rematch', canAskForRematch],
];

export function selectViewerMoves(table: TableForViewer): readonly ViewerMove[] {
  return MOVE_RULES.filter(([, isAllowed]) => isAllowed(table)).map(([move]) => move);
}

export function isMoveAvailable(table: TableForViewer, move: ViewerMove): boolean {
  return selectViewerMoves(table).includes(move);
}
