import { describe, expect, it } from "vitest";
import { doubleBooked, validateSide } from "./lineup";
import { saturdaysBetween, validatePairings } from "./schedule";
import { canTransition } from "./match-status";

const f = (id: string) => ({ id, gender: "F" as const });
const m = (id: string) => ({ id, gender: "M" as const });

describe("validateSide", () => {
  it("enforces gender per match type", () => {
    expect(validateSide("MIXED", [f("a"), m("b")])).toBeNull();
    expect(validateSide("MIXED", [m("b"), f("a")])).toBeNull();
    expect(validateSide("MIXED", [f("a"), f("c")])).not.toBeNull();
    expect(validateSide("LADIES", [f("a"), f("c")])).toBeNull();
    expect(validateSide("LADIES", [f("a"), m("b")])).not.toBeNull();
    expect(validateSide("MEN", [m("a"), m("b")])).toBeNull();
  });
  it("needs two different players", () => {
    expect(validateSide("MEN", [m("a")])).not.toBeNull();
    expect(validateSide("MEN", [m("a"), m("a")])).not.toBeNull();
  });
});

describe("doubleBooked", () => {
  it("flags a player twice in the same block only", () => {
    const r = doubleBooked([
      { block: 1, playerIds: ["a", "b"] },
      { block: 1, playerIds: ["a", "c"] },
      { block: 2, playerIds: ["b", "d"] },
    ]);
    expect([...r]).toEqual(["a"]);
  });
});

describe("schedule", () => {
  it("lists Saturdays in a range", () => {
    expect(saturdaysBetween("2026-10-12", "2026-11-01")).toEqual(["2026-10-17", "2026-10-24", "2026-10-31"]);
  });
  it("validates pairings", () => {
    expect(validatePairings([{ slot: "EARLY", homeTeamId: "A", awayTeamId: "B" }, { slot: "LATE", homeTeamId: "C", awayTeamId: "D" }], 4)).toBeNull();
    expect(validatePairings([{ slot: "EARLY", homeTeamId: "A", awayTeamId: "A" }], 4)).not.toBeNull();
    expect(validatePairings([{ slot: "EARLY", homeTeamId: "A", awayTeamId: "B" }, { slot: "LATE", homeTeamId: "A", awayTeamId: "C" }], 4)).not.toBeNull();
    expect(validatePairings([{ slot: "EARLY", homeTeamId: "A", awayTeamId: "B" }, { slot: "EARLY", homeTeamId: "C", awayTeamId: "D" }], 4)).not.toBeNull();
    expect(validatePairings([{ slot: "EARLY", homeTeamId: "A", awayTeamId: "B" }, { slot: "EARLY", homeTeamId: "C", awayTeamId: "D" }], 8)).toBeNull();
  });
});

describe("score state machine", () => {
  const base = { isAdmin: false, submittedByTeamId: "A" };
  it("lets only the opposing team approve", () => {
    expect(canTransition("approve", { ...base, status: "SUBMITTED", actorTeamId: "B" })).toBeNull();
    expect(canTransition("approve", { ...base, status: "SUBMITTED", actorTeamId: "A" })).not.toBeNull();
    expect(canTransition("approve", { ...base, status: "SUBMITTED", actorTeamId: null })).not.toBeNull();
  });
  it("locks approved scores except for admin reopen", () => {
    expect(canTransition("submit", { ...base, status: "APPROVED", actorTeamId: "A" })).not.toBeNull();
    expect(canTransition("reopen", { ...base, status: "APPROVED", actorTeamId: "A" })).not.toBeNull();
    expect(canTransition("reopen", { ...base, status: "APPROVED", actorTeamId: null, isAdmin: true })).toBeNull();
  });
  it("stops the opponent from overwriting a submitted score", () => {
    expect(canTransition("submit", { ...base, status: "SUBMITTED", actorTeamId: "B" })).not.toBeNull();
    expect(canTransition("submit", { ...base, status: "SUBMITTED", actorTeamId: "A" })).toBeNull();
    expect(canTransition("submit", { ...base, status: "DISPUTED", actorTeamId: "B" })).toBeNull();
  });
});
