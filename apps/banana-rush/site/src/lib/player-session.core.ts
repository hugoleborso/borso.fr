import { z } from 'zod';

const seatSchema = z.object({ playerId: z.string(), playerToken: z.string() });
const storedSeatsSchema = z.record(z.string(), z.unknown());

export type Seat = z.infer<typeof seatSchema>;
export type SeatsByJoinCode = Readonly<Record<string, Seat>>;

/**
 * @Blueprint core-persisted-slice-parsed-not-trusted
 * @BlueprintName Core Persisted Slice Parsed Rather Than Trusted
 * @BlueprintUsage Use for the pure half of anything read back out of browser storage, where the stored text was written by an older version of the same application.
 * @BlueprintDescription Parses the stored text through a schema, one entry at a time, and drops each entry that does not match, because a value written by a build that shipped last month is untrusted input in exactly the way a network response is. Parsing a stored list or map as one block would let one outdated entry empty the whole slice, which is how a single regular with a retired pirate part emptied Skull King's regulars strip. Keeping the parsing and the merging here, away from the module that touches `localStorage`, is what lets both be covered by ordinary unit tests with no browser and no stub, and it means a storage that throws can never take a parsing bug down with it.
 */
export function readSeats(rawValue: string | null): SeatsByJoinCode {
  try {
    const storedSeats = storedSeatsSchema.parse(JSON.parse(String(rawValue)));
    return Object.fromEntries(
      Object.entries(storedSeats).flatMap(([joinCode, entry]) => {
        const seat = seatSchema.safeParse(entry);
        return seat.success ? [[joinCode, seat.data]] : [];
      }),
    );
  } catch {
    return {};
  }
}

export function withSeat(seats: SeatsByJoinCode, joinCode: string, seat: Seat): SeatsByJoinCode {
  return { ...seats, [joinCode]: seat };
}

export function selectSeat(seats: SeatsByJoinCode, joinCode: string): Seat | null {
  return seats[joinCode] ?? null;
}
