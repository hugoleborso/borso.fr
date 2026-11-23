import {
  PLAYER_COLORS,
  PLAYER_ICONS,
  PLAYER_NAME_MAX_LENGTH,
  type PlayerColor,
  type PlayerIcon,
  type PlayerMark,
  suggestMark,
} from '@domain/player-mark.core';
import {
  isSameAvatar,
  type PirateAvatar,
  pirateAvatarSchema,
  suggestAvatar,
} from '@domain/pirate-avatar.core';
import { MAXIMUM_PLAYERS, MINIMUM_PLAYERS } from '@domain/round.core';
import { z } from 'zod';

const MAXIMUM_REGULARS = 16;

const rosterPlayerSchema = z.object({
  name: z.string(),
  icon: z.enum(PLAYER_ICONS),
  color: z.enum(PLAYER_COLORS),
  avatar: z.unknown().optional(),
});

export interface RosterPlayer {
  readonly name: string;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly avatar: PirateAvatar;
}

export interface Regular {
  readonly name: string;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly avatar: PirateAvatar | null;
}

export interface AccountMark {
  readonly name: string;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
}

function isSameName(first: string, second: string): boolean {
  return first.toLocaleLowerCase() === second.toLocaleLowerCase();
}

function isListed(roster: readonly RosterPlayer[], name: string): boolean {
  return roster.some((player) => isSameName(player.name, name));
}

// Stryker disable BlockStatement: equivalent mutant, an emptied catch answers undefined, which fails the list schema below exactly like this null.
function parseStored(rawValue: string | null): unknown {
  try {
    return JSON.parse(String(rawValue));
  } catch {
    return null;
  }
}
// Stryker restore BlockStatement

function readRegular(entry: unknown): Regular[] {
  const regular = rosterPlayerSchema.safeParse(entry);
  if (!regular.success) return [];
  const { avatar, ...mark } = regular.data;
  const pirate = pirateAvatarSchema.safeParse(avatar);
  return [{ ...mark, avatar: pirate.success ? pirate.data : null }];
}

// @FollowsBlueprint core-persisted-slice-parsed-not-trusted
export function readRegulars(rawValue: string | null): readonly Regular[] {
  const storedRegulars = z.array(z.unknown()).safeParse(parseStored(rawValue));
  if (!storedRegulars.success) return [];
  return storedRegulars.data.flatMap((entry) => readRegular(entry));
}

export function dressRegular(regular: Regular, table: readonly RosterPlayer[]): RosterPlayer {
  return { ...regular, avatar: regular.avatar ?? suggestAvatar(table.length) };
}

export function rememberRegulars(
  regulars: readonly Regular[],
  table: readonly RosterPlayer[],
): readonly Regular[] {
  const others = regulars.filter((regular) => !isListed(table, regular.name));
  return [...table, ...others].slice(0, MAXIMUM_REGULARS);
}

export function selectAbsentRegulars(
  regulars: readonly Regular[],
  table: readonly RosterPlayer[],
): readonly RosterPlayer[] {
  return regulars
    .filter((regular) => !isListed(table, regular.name))
    .map((regular) => dressRegular(regular, table));
}

export function trimPlayerName(rawName: string): string {
  return rawName.trim().slice(0, PLAYER_NAME_MAX_LENGTH);
}

export function selectRename(draftName: string, currentName: string): string | null {
  const name = trimPlayerName(draftName);
  return name === '' || name === currentName ? null : name;
}

export function selectFreeMark(table: readonly RosterPlayer[]): PlayerMark {
  const fallback = suggestMark(table.length);
  return {
    icon:
      PLAYER_ICONS.find((icon) => !table.some((player) => player.icon === icon)) ?? fallback.icon,
    color:
      PLAYER_COLORS.find((color) => !table.some((player) => player.color === color)) ??
      fallback.color,
  };
}

export function canSeatAnother(table: readonly RosterPlayer[]): boolean {
  return table.length < MAXIMUM_PLAYERS;
}

export function canStartGame(table: readonly RosterPlayer[]): boolean {
  return table.length >= MINIMUM_PLAYERS;
}

export function seatPlayer(
  table: readonly RosterPlayer[],
  player: RosterPlayer,
): readonly RosterPlayer[] {
  if (player.name === '' || isListed(table, player.name) || !canSeatAnother(table)) return table;
  return [...table, player];
}

export function replacePlayer(
  table: readonly RosterPlayer[],
  index: number,
  player: RosterPlayer,
): readonly RosterPlayer[] {
  return table.map((seated, seat) => (seat === index ? player : seated));
}

export function unseatPlayer(
  table: readonly RosterPlayer[],
  index: number,
): readonly RosterPlayer[] {
  return table.filter((_, seat) => seat !== index);
}

export function withAccountFirst(
  account: RosterPlayer | null,
  table: readonly RosterPlayer[],
): readonly RosterPlayer[] {
  if (account === null) return table;
  return [account, ...table.filter((player) => !isSameName(player.name, account.name))];
}

export interface SeatToCreate extends RosterPlayer {
  readonly isMe?: true;
}

export function selectSeatsToCreate(
  table: readonly RosterPlayer[],
  isFirstSeatMine: boolean,
): readonly SeatToCreate[] {
  return table.map(({ name, icon, color, avatar }, seat) =>
    isFirstSeatMine && seat === 0
      ? { name, icon, color, avatar, isMe: true }
      : { name, icon, color, avatar },
  );
}

export function readLastPirate(rawValue: string | null): PirateAvatar | null {
  try {
    const stored = pirateAvatarSchema.safeParse(JSON.parse(String(rawValue)));
    return stored.success ? stored.data : null;
  } catch {
    return null;
  }
}

export function selectNewSeatAvatar(
  lastPirate: PirateAvatar | null,
  table: readonly RosterPlayer[],
): PirateAvatar {
  if (lastPirate === null) return suggestAvatar(table.length);
  const isWorn = table.some((player) => isSameAvatar(player.avatar, lastPirate));
  return isWorn ? suggestAvatar(table.length) : lastPirate;
}

export function selectTypedSeat(
  typedName: string,
  regulars: readonly Regular[],
  lastPirate: PirateAvatar | null,
  table: readonly RosterPlayer[],
): RosterPlayer {
  const name = trimPlayerName(typedName);
  const regular = regulars.find((candidate) => isSameName(candidate.name, name));
  if (regular !== undefined) return dressRegular(regular, table);
  return { name, ...selectFreeMark(table), avatar: selectNewSeatAvatar(lastPirate, table) };
}

const ACCOUNT_SEAT = 0;

export function seatAccount(
  account: AccountMark | null,
  regulars: readonly Regular[],
): RosterPlayer | null {
  if (account === null) return null;
  const regular = regulars.find((candidate) => isSameName(candidate.name, account.name));
  return {
    name: account.name,
    icon: account.icon,
    color: account.color,
    avatar: regular?.avatar ?? suggestAvatar(ACCOUNT_SEAT),
  };
}
