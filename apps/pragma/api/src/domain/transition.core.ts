/**
 * Transition-warning rule between two consecutive setlist entries.
 * Spec: "a pair warns iff no harmonic instrument is held by the same
 * member across both songs."
 *
 * Pure function over lineups + the instrument map (which instruments
 * are harmonic). No `now` — the rule is time-independent. No I/O.
 *
 * Vocabulary:
 *   - Lineup: `Record<MemberId, InstrumentId | null>`. A null instrument
 *     means the member sits out. An absent key means the same.
 *   - Instrument map: `Record<InstrumentId, { isHarmonic: boolean }>`.
 *
 * Output:
 *   - `kind: 'safe'` — at least one harmonic instrument is held by the
 *     same member across both songs.
 *   - `kind: 'warn'` — no such overlap. The `missingHarmonicMembers`
 *     list (sorted) tells the UI which members lost their harmonic
 *     anchor; useful for the side-gutter tooltip.
 */

export type MemberId = string;
export type InstrumentId = string;
export type Lineup = Readonly<Record<MemberId, InstrumentId | null>>;
export type InstrumentMap = Readonly<Record<InstrumentId, { readonly isHarmonic: boolean }>>;

export type TransitionVerdict =
  | { kind: 'safe' }
  | { kind: 'warn'; missingHarmonicMembers: readonly MemberId[] };

function harmonicMembersIn(lineup: Lineup, instruments: InstrumentMap): Set<MemberId> {
  const members = new Set<MemberId>();
  for (const [memberId, instrumentId] of Object.entries(lineup)) {
    if (instrumentId === null) continue;
    const instrument = instruments[instrumentId];
    if (instrument?.isHarmonic === true) {
      members.add(memberId);
    }
  }
  return members;
}

export function evaluateTransition(
  lineupA: Lineup,
  lineupB: Lineup,
  instruments: InstrumentMap,
): TransitionVerdict {
  const harmonicMembersA = harmonicMembersIn(lineupA, instruments);
  const harmonicMembersB = harmonicMembersIn(lineupB, instruments);
  const overlap: MemberId[] = [];
  for (const member of harmonicMembersA) {
    if (harmonicMembersB.has(member)) overlap.push(member);
  }
  if (overlap.length > 0) return { kind: 'safe' };

  const missing = new Set<MemberId>();
  for (const member of harmonicMembersA) missing.add(member);
  for (const member of harmonicMembersB) missing.add(member);
  return {
    kind: 'warn',
    missingHarmonicMembers: [...missing].toSorted(),
  };
}
