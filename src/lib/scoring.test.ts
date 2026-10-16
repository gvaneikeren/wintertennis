import { describe, expect, it } from "vitest";
import { fixturePoints, formatPoints, matchPoints, setPoints, standings, validateSet } from "./scoring";

const s = (homeGames: number, awayGames: number, played = true) => ({ played, homeGames, awayGames });

describe("setPoints", () => {
  it("gives the winner of a finished set 1 point", () => {
    expect(setPoints(s(5, 3))).toEqual({ home: 1, away: 0 });
    expect(setPoints(s(2, 5))).toEqual({ home: 0, away: 1 });
  });
  it("gives the leader of an unfinished set 1 point", () => {
    expect(setPoints(s(3, 2))).toEqual({ home: 1, away: 0 });
    expect(setPoints(s(0, 1))).toEqual({ home: 0, away: 1 });
  });
  it("shares points on equal games", () => {
    expect(setPoints(s(4, 4))).toEqual({ home: 0.5, away: 0.5 });
    expect(setPoints(s(0, 0))).toEqual({ home: 0.5, away: 0.5 });
  });
  it("shares points for an unplayed set", () => {
    expect(setPoints(s(5, 0, false))).toEqual({ home: 0.5, away: 0.5 });
  });
});

describe("validateSet", () => {
  it("accepts valid and unfinished scores", () => {
    for (const [h, a] of [[5, 4], [3, 2], [4, 4], [0, 0], [0, 5]]) expect(validateSet(s(h, a))).toBeNull();
  });
  it("rejects 5-5, out-of-range and non-integers", () => {
    expect(validateSet(s(5, 5))).not.toBeNull();
    expect(validateSet(s(6, 4))).not.toBeNull();
    expect(validateSet(s(-1, 2))).not.toBeNull();
    expect(validateSet(s(2.5, 2))).not.toBeNull();
  });
  it("ignores games for an unplayed set", () => {
    expect(validateSet(s(9, 9, false))).toBeNull();
  });
});

describe("matchPoints", () => {
  it("always totals 3 points", () => {
    const cases = [[s(5, 3), s(4, 4), s(1, 2)], [s(5, 0)], [], [s(2, 2), s(0, 0, false), s(3, 1)]];
    for (const c of cases) {
      const p = matchPoints(c);
      expect(p.home + p.away).toBe(3);
    }
  });
  it("treats missing sets as unplayed", () => {
    expect(matchPoints([s(5, 3)])).toEqual({ home: 2, away: 1 });
  });
  it("uses setNo when given", () => {
    expect(matchPoints([{ setNo: 3, ...s(0, 5) }])).toEqual({ home: 1, away: 2 });
  });
});

describe("fixturePoints", () => {
  const matches = [
    { status: "APPROVED", sets: [s(5, 3), s(5, 2), s(5, 1)] },
    { status: "SUBMITTED", sets: [s(0, 5), s(0, 5), s(0, 5)] },
    { status: "OPEN", sets: [] },
  ];
  it("counts only approved matches", () => {
    expect(fixturePoints(matches)).toEqual({ home: 3, away: 0 });
  });
  it("can include pending scores", () => {
    expect(fixturePoints(matches, true)).toEqual({ home: 3, away: 3 });
  });
});

describe("standings", () => {
  it("ranks by points, then game difference", () => {
    const rows = standings(
      ["A", "B", "C"],
      [
        { homeTeamId: "A", awayTeamId: "B", matches: [{ status: "APPROVED", sets: [s(5, 4), s(4, 4), s(0, 0, false)] }] },
        { homeTeamId: "C", awayTeamId: "A", matches: [{ status: "SUBMITTED", sets: [s(5, 0), s(5, 0), s(5, 0)] }] },
      ],
    );
    expect(rows.map((r) => r.teamId)).toEqual(["A", "B", "C"]);
    expect(rows[0]).toMatchObject({ played: 1, points: 2, setsWon: 1, gamesWon: 9, gamesLost: 8 });
    expect(rows[1]).toMatchObject({ played: 1, points: 1 });
    expect(rows[2]).toMatchObject({ played: 0, points: 0 });
  });
});

describe("formatPoints", () => {
  it("renders halves", () => {
    expect(formatPoints(0.5)).toBe("½");
    expect(formatPoints(1.5)).toBe("1½");
    expect(formatPoints(12)).toBe("12");
  });
});
