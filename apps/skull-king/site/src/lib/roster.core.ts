import {
  PLAYER_COLORS,
  PLAYER_ICONS,
  PLAYER_NAME_MAX_LENGTH,
  type PlayerColor,
  type PlayerIcon,
  type PlayerMark,
  suggestMark,
} from '@domain/player-mark.core';
import { MAXIMUM_PLAYERS, MINIMUM_PLAYERS } from '@domain/round.core';
import { z } from 'zod';

const MAXIMUM_REGULARS = 16;

const rosterPlayerSchema = z.object({
  name: z.string(),
  icon: z.enum(PLAYER_ICONS),
  color: z.enum(PLAYER_COLORS),
});

export interface RosterPlayer {
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

// @FollowsBlueprint core-persisted-slice-parsed-not-trusted
export function readRegulars(rawValue: string | null): readonly RosterPlayer[] {
  try {
    const stored: unknown = JSON.parse(String(rawValue));
    const regulars = z.array(rosterPlayerSchema).safeParse(stored);
    return regulars.success ? regulars.data : [];
  } catch {
    return [];
  }
}

export function rememberRegulars(
  regulars: readonly RosterPlayer[],
  table: readonly RosterPlayer[],
): readonly RosterPlayer[] {
  const others = regulars.filter((regular) => !isListed(table, regular.name));
  return [...table, ...others].slice(0, MAXIMUM_REGULARS);
}

export function selectAbsentRegulars(
  regulars: readonly RosterPlayer[],
  table: readonly RosterPlayer[],
): readonly RosterPlayer[] {
  return regulars.filter((regular) => !isListed(table, regular.name));
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
