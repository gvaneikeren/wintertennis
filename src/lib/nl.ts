// All Dutch UI texts that are shared between pages. Page-specific copy may live inline.

export const nl = {
  appName: "WinterTennis",
  tagline: "Indoor tenniscompetitie op zaterdagavond",
  nav: { home: "Home", schedule: "Programma", standings: "Stand", team: "Mijn team", admin: "Beheer", login: "Inloggen" },
  matchType: { MIXED: "Gemengd dubbel", LADIES: "Damesdubbel", MEN: "Herendubbel" },
  gender: { F: "Dame", M: "Heer" },
  genderPlural: { F: "Dames", M: "Heren" },
  status: {
    OPEN: "Open",
    SUBMITTED: "Wacht op akkoord",
    APPROVED: "Akkoord",
    DISPUTED: "Betwist",
  },
  role: { CAPTAIN: "Aanvoerder", MEMBER: "Teamlid" },
  slot: { EARLY: "Vroeg", LATE: "Laat" },
  actions: {
    submit: "Uitslag versturen",
    approve: "Akkoord",
    approveAll: "Alles akkoord",
    dispute: "Betwisten",
    reopen: "Heropenen",
    save: "Opslaan",
    cancel: "Annuleren",
    invite: "Uitnodigen",
    logout: "Uitloggen",
  },
  notPlayed: "Niet gespeeld",
  set: "Set",
  points: "Punten",
  noSeason: "Er is nog geen actief seizoen.",
} as const;

const dateFmt = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const longDateFmt = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "za 1 nov" — evening dates are stored as UTC dates. */
export const formatDate = (d: Date) => dateFmt.format(d);
export const formatLongDate = (d: Date) => longDateFmt.format(d);

export const formatDateTime = (d: Date) =>
  new Intl.DateTimeFormat("nl-NL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(d);
