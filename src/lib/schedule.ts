// Evening programme: which matches a fixture has and when they start.

export type Slot = "EARLY" | "LATE";
export type MatchType = "MIXED" | "LADIES" | "MEN";

/** Start hour per slot for block 1 (before the break) and block 2 (after). */
export const SLOT_HOURS: Record<Slot, [number, number]> = {
  EARLY: [19, 21],
  LATE: [20, 22],
};

/** Every fixture consists of these 8 matches. */
export const FIXTURE_TEMPLATE: { number: number; block: 1 | 2; type: MatchType }[] = [
  { number: 1, block: 1, type: "MIXED" },
  { number: 2, block: 1, type: "MIXED" },
  { number: 3, block: 1, type: "MIXED" },
  { number: 4, block: 1, type: "MIXED" },
  { number: 5, block: 2, type: "LADIES" },
  { number: 6, block: 2, type: "LADIES" },
  { number: 7, block: 2, type: "MEN" },
  { number: 8, block: 2, type: "MEN" },
];

export function blockTime(slot: Slot, block: number): string {
  const start = SLOT_HOURS[slot][block - 1];
  return `${start}:00 – ${start + 1}:00`;
}

export function slotLabel(slot: Slot): string {
  const [a, b] = SLOT_HOURS[slot];
  return `${a}:00 & ${b}:00`;
}

/** How many fixtures fit in one slot given the number of courts (4 matches per fixture per block). */
export function fixturesPerSlot(courts: number): number {
  return Math.max(1, Math.floor(courts / 4));
}

/** All Saturdays between two dates (inclusive), as YYYY-MM-DD strings. */
export function saturdaysBetween(from: string, to: string): string[] {
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  const out: string[] = [];
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

export type PairingInput = { slot: Slot; homeTeamId: string; awayTeamId: string };

/** Returns an error message, or null when the evening's pairings are valid. */
export function validatePairings(pairings: PairingInput[], courts: number): string | null {
  const seen = new Set<string>();
  const perSlot: Record<string, number> = {};
  const max = fixturesPerSlot(courts);
  for (const p of pairings) {
    if (p.homeTeamId === p.awayTeamId) return "Een team kan niet tegen zichzelf spelen";
    for (const t of [p.homeTeamId, p.awayTeamId]) {
      if (seen.has(t)) return "Een team kan maar één keer per avond spelen";
      seen.add(t);
    }
    perSlot[p.slot] = (perSlot[p.slot] ?? 0) + 1;
    if (perSlot[p.slot] > max) return `Maximaal ${max} wedstrijd(en) per tijdslot met ${courts} banen`;
  }
  return null;
}
