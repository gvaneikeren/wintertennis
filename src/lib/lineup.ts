import type { MatchType } from "./schedule";

export type Gender = "F" | "M";

/** Genders required for the two players of one side, order-independent. */
export const REQUIRED_GENDERS: Record<MatchType, [Gender, Gender]> = {
  MIXED: ["F", "M"],
  LADIES: ["F", "F"],
  MEN: ["M", "M"],
};

export function allowedGender(type: MatchType, position: 1 | 2): Gender {
  return REQUIRED_GENDERS[type][position - 1];
}

/** Checks the two players of one side. Returns an error message or null. */
export function validateSide(type: MatchType, players: { id: string; gender: Gender }[]): string | null {
  if (players.length !== 2) return "Kies twee spelers";
  if (players[0].id === players[1].id) return "Kies twee verschillende spelers";
  const got = players.map((p) => p.gender).sort().join("");
  const need = [...REQUIRED_GENDERS[type]].sort().join("");
  if (got !== need) {
    if (type === "MIXED") return "Gemengd dubbel: één dame en één heer";
    if (type === "LADIES") return "Damesdubbel: twee dames";
    return "Herendubbel: twee heren";
  }
  return null;
}

/** Players that appear in more than one match of the same block (a warning, not an error). */
export function doubleBooked(
  matches: { block: number; playerIds: string[] }[],
): Set<string> {
  const counts = new Map<string, number>();
  for (const m of matches) {
    for (const id of m.playerIds) {
      const key = `${m.block}:${id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const out = new Set<string>();
  for (const [key, n] of counts) if (n > 1) out.add(key.split(":")[1]);
  return out;
}
