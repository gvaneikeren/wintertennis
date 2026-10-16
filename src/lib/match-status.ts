// Score workflow state machine. Enforced server-side in the score actions.

export type MatchStatus = "OPEN" | "SUBMITTED" | "APPROVED" | "DISPUTED";
export type ScoreAction = "submit" | "approve" | "dispute" | "reopen";

type Ctx = {
  status: MatchStatus;
  actorTeamId: string | null; // the user's team in this fixture (null for admin outside teams)
  submittedByTeamId: string | null;
  isAdmin: boolean;
};

/** Returns null when allowed, otherwise a Dutch error message. */
export function canTransition(action: ScoreAction, ctx: Ctx): string | null {
  const { status, actorTeamId, submittedByTeamId, isAdmin } = ctx;
  switch (action) {
    case "submit":
      if (!actorTeamId && !isAdmin) return "Geen toegang";
      if (status === "APPROVED") return "Deze uitslag is al akkoord";
      // A submitted score can only be changed by the team that submitted it (or admin).
      if (status === "SUBMITTED" && submittedByTeamId !== actorTeamId && !isAdmin)
        return "De tegenstander heeft al een uitslag ingevoerd: keur goed of betwist";
      return null;
    case "approve":
    case "dispute":
      if (status !== "SUBMITTED") return "Er is geen uitslag om te beoordelen";
      if (isAdmin && action === "approve") return null;
      if (!actorTeamId) return "Geen toegang";
      if (actorTeamId === submittedByTeamId) return "Je kunt je eigen uitslag niet goedkeuren";
      return null;
    case "reopen":
      if (!isAdmin) return "Alleen de beheerder kan een uitslag heropenen";
      if (status === "OPEN") return "Uitslag is al open";
      return null;
  }
}

export function nextStatus(action: ScoreAction): MatchStatus {
  return { submit: "SUBMITTED", approve: "APPROVED", dispute: "DISPUTED", reopen: "OPEN" }[action] as MatchStatus;
}
