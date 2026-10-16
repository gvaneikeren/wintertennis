// Pure scoring rules for the competition. No database access here.
//
// - A set is played to 5 games; scores stop when time runs out, so 3-2 is a valid final score.
// - The team with more games in a set gets 1 point.
// - Equal games or an unplayed set: 0.5 point each.
// - A match has 3 sets, so it is always worth 3 points in total.

export const MAX_GAMES = 5;
export const SETS_PER_MATCH = 3;

export type SetScore = {
  played: boolean;
  homeGames: number;
  awayGames: number;
};

export type Points = { home: number; away: number };

export function validateSet(set: SetScore): string | null {
  if (!set.played) return null;
  const { homeGames: h, awayGames: a } = set;
  if (!Number.isInteger(h) || !Number.isInteger(a)) return "Games moeten hele getallen zijn";
  if (h < 0 || a < 0 || h > MAX_GAMES || a > MAX_GAMES) return `Games moeten tussen 0 en ${MAX_GAMES} liggen`;
  if (h === MAX_GAMES && a === MAX_GAMES) return `Beide teams kunnen geen ${MAX_GAMES} games hebben`;
  return null;
}

export function setPoints(set: SetScore): Points {
  if (!set.played) return { home: 0.5, away: 0.5 };
  if (set.homeGames > set.awayGames) return { home: 1, away: 0 };
  if (set.awayGames > set.homeGames) return { home: 0, away: 1 };
  return { home: 0.5, away: 0.5 };
}

/** Normalizes to exactly 3 sets; missing sets count as unplayed. */
export function normalizeSets(sets: (SetScore & { setNo?: number })[]): SetScore[] {
  const numbered = sets.some((x) => x.setNo !== undefined);
  const out: SetScore[] = [];
  for (let i = 0; i < SETS_PER_MATCH; i++) {
    const s = numbered ? sets.find((x) => x.setNo === i + 1) : sets[i];
    out.push(s ? { played: s.played, homeGames: s.homeGames, awayGames: s.awayGames } : { played: false, homeGames: 0, awayGames: 0 });
  }
  return out;
}

export function matchPoints(sets: (SetScore & { setNo?: number })[]): Points {
  return normalizeSets(sets).reduce<Points>(
    (acc, s) => {
      const p = setPoints(s);
      return { home: acc.home + p.home, away: acc.away + p.away };
    },
    { home: 0, away: 0 },
  );
}

export function matchGames(sets: SetScore[]): Points {
  return sets.reduce<Points>(
    (acc, s) => (s.played ? { home: acc.home + s.homeGames, away: acc.away + s.awayGames } : acc),
    { home: 0, away: 0 },
  );
}

export type ScoredMatch = { status: string; sets: (SetScore & { setNo?: number })[] };

/** Points for a fixture; only approved matches count unless includePending is set. */
export function fixturePoints(matches: ScoredMatch[], includePending = false): Points {
  return matches
    .filter((m) => m.status === "APPROVED" || (includePending && m.status !== "OPEN"))
    .reduce<Points>(
      (acc, m) => {
        const p = matchPoints(m.sets);
        return { home: acc.home + p.home, away: acc.away + p.away };
      },
      { home: 0, away: 0 },
    );
}

export type StandingsFixture = {
  homeTeamId: string;
  awayTeamId: string;
  matches: ScoredMatch[];
};

export type StandingsRow = {
  teamId: string;
  played: number; // fixtures with at least one approved match
  points: number;
  setsWon: number;
  gamesWon: number;
  gamesLost: number;
};

export function standings(teamIds: string[], fixtures: StandingsFixture[]): StandingsRow[] {
  const rows = new Map<string, StandingsRow>(
    teamIds.map((id) => [id, { teamId: id, played: 0, points: 0, setsWon: 0, gamesWon: 0, gamesLost: 0 }]),
  );
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) {
      r = { teamId: id, played: 0, points: 0, setsWon: 0, gamesWon: 0, gamesLost: 0 };
      rows.set(id, r);
    }
    return r;
  };

  for (const f of fixtures) {
    const approved = f.matches.filter((m) => m.status === "APPROVED");
    if (approved.length === 0) continue;
    const home = row(f.homeTeamId);
    const away = row(f.awayTeamId);
    home.played++;
    away.played++;
    for (const m of approved) {
      for (const s of normalizeSets(m.sets)) {
        const p = setPoints(s);
        home.points += p.home;
        away.points += p.away;
        if (p.home === 1) home.setsWon++;
        if (p.away === 1) away.setsWon++;
        if (s.played) {
          home.gamesWon += s.homeGames;
          home.gamesLost += s.awayGames;
          away.gamesWon += s.awayGames;
          away.gamesLost += s.homeGames;
        }
      }
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.gamesWon - b.gamesLost - (a.gamesWon - a.gamesLost) ||
      b.gamesWon - a.gamesWon,
  );
}

/** Formats 1.5 as "1½". */
export function formatPoints(n: number): string {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? "½" : `${whole}½`;
}
