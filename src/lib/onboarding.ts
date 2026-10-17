// "Aan de slag" checklist rules. Pure: the server query collects the counts, this decides the steps.

export type OnboardingStep = {
  id: string;
  label: string;
  detail?: string;
  done: boolean;
  optional?: boolean;
  href: string;
  helpId: string;
};

export type TeamOnboardingInput = {
  isCaptain: boolean;
  ladies: number;
  men: number;
  memberships: number;
  openInvites: number;
  linkedToPlayer: boolean;
  /** Next upcoming fixture of the team, if any. */
  nextFixture: { id: string; dateLabel: string; matchesWithFullLineup: number; matches: number } | null;
};

export const MIN_PER_GENDER = 4;

export function teamOnboardingSteps(i: TeamOnboardingInput): OnboardingStep[] {
  const steps: OnboardingStep[] = [];
  if (i.isCaptain) {
    steps.push({
      id: "players",
      label: "Voeg minimaal 4 dames en 4 heren toe",
      detail: `${Math.min(i.ladies, MIN_PER_GENDER)}/4 dames · ${Math.min(i.men, MIN_PER_GENDER)}/4 heren`,
      done: i.ladies >= MIN_PER_GENDER && i.men >= MIN_PER_GENDER,
      href: "/team",
      helpId: "spelers",
    });
    steps.push({
      id: "substitutes",
      label: "Voeg invallers toe",
      detail: "Gewoon als extra speler",
      done: i.ladies + i.men > MIN_PER_GENDER * 2,
      optional: true,
      href: "/team",
      helpId: "spelers",
    });
    steps.push({
      id: "invite",
      label: "Nodig minimaal één teamgenoot uit",
      detail: "Dan kunnen zij ook uitslagen invoeren en goedkeuren",
      done: i.memberships > 1 || i.openInvites > 0,
      href: "/team",
      helpId: "uitnodigen",
    });
  }
  steps.push({
    id: "link",
    label: "Koppel jezelf aan je speler",
    detail: "Tik op Dit ben ik bij je naam",
    done: i.linkedToPlayer,
    href: "/team",
    helpId: "koppelen",
  });
  if (i.nextFixture) {
    const f = i.nextFixture;
    steps.push({
      id: "lineup",
      label: `Vul de opstelling in voor ${f.dateLabel}`,
      detail: `${f.matchesWithFullLineup}/${f.matches} partijen ingevuld`,
      done: f.matches > 0 && f.matchesWithFullLineup >= f.matches,
      href: `/fixtures/${f.id}`,
      helpId: "opstelling",
    });
  }
  return steps;
}

export type AdminOnboardingInput = {
  hasSeason: boolean;
  teams: number;
  teamsWithoutCaptain: number;
  eveningsWithFixtures: number;
};

export function adminOnboardingSteps(i: AdminOnboardingInput): OnboardingStep[] {
  return [
    { id: "season", label: "Maak een seizoen aan", done: i.hasSeason, href: "/admin", helpId: "beheer" },
    {
      id: "teams",
      label: "Voeg minimaal 2 teams toe",
      detail: `${i.teams} team${i.teams === 1 ? "" : "s"}`,
      done: i.teams >= 2,
      href: "/admin/teams",
      helpId: "beheer",
    },
    {
      id: "captains",
      label: "Nodig per team een aanvoerder uit",
      detail: i.teams > 0 && i.teamsWithoutCaptain > 0 ? `${i.teamsWithoutCaptain} team(s) zonder aanvoerder` : undefined,
      done: i.teams > 0 && i.teamsWithoutCaptain === 0,
      href: "/admin/teams",
      helpId: "beheer",
    },
    {
      id: "schedule",
      label: "Plan de eerste speelavond",
      done: i.eveningsWithFixtures > 0,
      href: "/admin/schedule",
      helpId: "beheer",
    },
  ];
}

/** Progress over the required steps; the checklist hides when everything required is done. */
export function progress(steps: OnboardingStep[]) {
  const required = steps.filter((s) => !s.optional);
  const done = required.filter((s) => s.done).length;
  return { done, total: required.length, complete: done === required.length };
}
