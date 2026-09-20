import { z } from 'zod';

const seatSchema = z.object({ playerId: z.string(), playerToken: z.string() });
const seatsSchema = z.record(z.string(), seatSchema);

export type Seat = z.infer<typeof seatSchema>;
export type SeatsByJoinCode = z.infer<typeof seatsSchema>;

/**
 * @Blueprint core-persisted-slice-parsed-not-trusted
 * @BlueprintName Core Persisted Slice Parsed Rather Than Trusted
 * @BlueprintUsage Use for the pure half of anything read back out of browser storage, where the stored text was written by an older version of the same application.
 * @BlueprintDescription Parses the stored text through a schema and answers an empty slice for anything that does not match, because a value written by a build that shipped last month is untrusted input in exactly the way a network response is. Keeping the parsing and the merging here, away from the module that touches `localStorage`, is what lets both be covered by ordinary unit tests with no browser and no stub, and it means a storage that throws can never take a parsing bug down with it.
 */
export function readSeats(rawValue: string | null): SeatsByJoinCode {
  try {
    const storedSeats: unknown = JSON.parse(String(rawValue));
    const seats = seatsSchema.safeParse(storedSeats);
    return seats.success ? seats.data : {};
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
