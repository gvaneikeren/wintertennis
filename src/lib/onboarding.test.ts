import { describe, expect, it } from "vitest";
import { adminOnboardingSteps, progress, teamOnboardingSteps, type TeamOnboardingInput } from "./onboarding";
import { guides } from "./help";

const base: TeamOnboardingInput = {
  isCaptain: true,
  ladies: 4,
  men: 4,
  memberships: 2,
  openInvites: 0,
  linkedToPlayer: true,
  nextFixture: { id: "f1", dateLabel: "za 1 nov", matchesWithFullLineup: 8, matches: 8 },
};

const step = (steps: ReturnType<typeof teamOnboardingSteps>, id: string) => steps.find((s) => s.id === id)!;

describe("teamOnboardingSteps", () => {
  it("needs 4 ladies and 4 men and shows progress", () => {
    const s = teamOnboardingSteps({ ...base, ladies: 3 });
    expect(step(s, "players").done).toBe(false);
    expect(step(s, "players").detail).toBe("3/4 dames · 4/4 heren");
    expect(progress(s).complete).toBe(false);
  });

  it("treats substitutes as optional", () => {
    const s = teamOnboardingSteps(base);
    expect(step(s, "substitutes")).toMatchObject({ done: false, optional: true });
    expect(progress(s).complete).toBe(true);
    expect(step(teamOnboardingSteps({ ...base, men: 5 }), "substitutes").done).toBe(true);
  });

  it("counts an open invite as inviting a teammate", () => {
    expect(step(teamOnboardingSteps({ ...base, memberships: 1 }), "invite").done).toBe(false);
    expect(step(teamOnboardingSteps({ ...base, memberships: 1, openInvites: 1 }), "invite").done).toBe(true);
  });

  it("gives members only their own steps", () => {
    const s = teamOnboardingSteps({ ...base, isCaptain: false, linkedToPlayer: false });
    expect(s.map((x) => x.id)).toEqual(["link", "lineup"]);
    expect(progress(s)).toEqual({ done: 1, total: 2, complete: false });
  });

  it("skips the line-up step without an upcoming fixture", () => {
    const s = teamOnboardingSteps({ ...base, nextFixture: null });
    expect(s.find((x) => x.id === "lineup")).toBeUndefined();
  });

  it("requires every match to have a full line-up", () => {
    const s = teamOnboardingSteps({ ...base, nextFixture: { id: "f", dateLabel: "x", matchesWithFullLineup: 7, matches: 8 } });
    expect(step(s, "lineup")).toMatchObject({ done: false, href: "/fixtures/f" });
  });
});

describe("adminOnboardingSteps", () => {
  it("is complete once a season, teams with captains and an evening exist", () => {
    expect(progress(adminOnboardingSteps({ hasSeason: false, teams: 0, teamsWithoutCaptain: 0, eveningsWithFixtures: 0 })).done).toBe(0);
    expect(progress(adminOnboardingSteps({ hasSeason: true, teams: 4, teamsWithoutCaptain: 0, eveningsWithFixtures: 1 })).complete).toBe(true);
    expect(progress(adminOnboardingSteps({ hasSeason: true, teams: 4, teamsWithoutCaptain: 1, eveningsWithFixtures: 1 })).complete).toBe(false);
  });
});

describe("help links", () => {
  it("every checklist step links to an existing guide", () => {
    const ids = new Set(guides.map((g) => g.id));
    const all = [
      ...teamOnboardingSteps({ ...base, isCaptain: true }),
      ...adminOnboardingSteps({ hasSeason: true, teams: 2, teamsWithoutCaptain: 0, eveningsWithFixtures: 1 }),
    ];
    for (const s of all) expect(ids.has(s.helpId)).toBe(true);
  });
});
