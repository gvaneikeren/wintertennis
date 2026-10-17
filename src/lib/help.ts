// Content of the in-app manual (/help). Pure data: the help page, onboarding checklist and tips link
// to guides by id (/help#<id>). When a feature changes, update its guide here.

export type HelpRole = "all" | "member" | "captain" | "admin";

/** A small replica of the real control, so users recognise it in the app. */
export type Hint =
  | { kind: "button"; label: string; variant?: "primary" | "outline" | "danger" }
  | { kind: "badge"; label: string; tone: "neutral" | "brand" | "warn" | "danger" }
  | { kind: "tab"; label: string }
  | { kind: "stepper" };

export type Guide = {
  id: string;
  title: string;
  icon: "calendar" | "user-plus" | "send" | "link" | "users" | "pencil" | "check" | "settings" | "smartphone";
  roles: HelpRole[];
  intro: string;
  steps: { text: string; hint?: Hint }[];
  cta?: { label: string; href: string };
};

export const ROLE_LABELS: Record<HelpRole, string> = {
  all: "Iedereen",
  member: "Teamlid",
  captain: "Aanvoerder",
  admin: "Beheerder",
};

export const guides: Guide[] = [
  {
    id: "speelavond",
    title: "Zo werkt een speelavond",
    icon: "calendar",
    roles: ["all"],
    intro: "Op zaterdagavond spelen twee teams 8 dubbelpartijen tegen elkaar: 4 vóór en 4 na de pauze.",
    steps: [
      { text: "Vroeg tijdslot: 19:00–20:00 en 21:00–22:00. Laat tijdslot: 20:00–21:00 en 22:00–23:00." },
      { text: "Vóór de pauze: 4 gemengd dubbels (1 dame + 1 heer per kant).", hint: { kind: "badge", label: "Gemengd dubbel", tone: "neutral" } },
      { text: "Na de pauze: 2 damesdubbels en 2 herendubbels." },
      { text: "Een set gaat tot 5 games, maximaal 3 sets. Is de tijd om? Dan telt de stand van dat moment." },
      { text: "Per set: wie de meeste games heeft krijgt 1 punt. Gelijk of niet gespeeld: ieder ½ punt. Een partij is dus altijd 3 punten waard." },
      { text: "Alleen uitslagen met de status Akkoord tellen mee in de stand.", hint: { kind: "badge", label: "Akkoord", tone: "brand" } },
    ],
    cta: { label: "Bekijk het programma", href: "/schedule" },
  },
  {
    id: "spelers",
    title: "Spelers en invallers toevoegen",
    icon: "user-plus",
    roles: ["captain"],
    intro: "Een team heeft minimaal 4 dames en 4 heren nodig. Invallers voeg je gewoon toe als extra speler.",
    steps: [
      { text: "Tik onderin op Mijn team.", hint: { kind: "tab", label: "Mijn team" } },
      { text: "Scroll naar Spelers. Vul een naam in en kies Dame of Heer." },
      { text: "Tik op Toevoegen. Herhaal dit tot je minimaal 4 dames en 4 heren hebt.", hint: { kind: "button", label: "Toevoegen" } },
      { text: "Invallers: voeg ze op dezelfde manier toe. Ze staan daarna in de lijst en zijn te kiezen bij elke opstelling." },
      { text: "Last-minute invaller? Bij Opstelling kun je ook direct een nieuwe naam typen en op + tikken." },
      { text: "Speler weg? Tik op het potloodje naast de naam om te wijzigen of te verwijderen. Eerdere uitslagen blijven bewaard." },
    ],
    cta: { label: "Ga naar Mijn team", href: "/team" },
  },
  {
    id: "uitnodigen",
    title: "Teamgenoten uitnodigen",
    icon: "send",
    roles: ["captain"],
    intro: "Nodig teamgenoten uit die je kunnen vervangen. Ze krijgen dezelfde rechten als jij: spelers beheren, uitnodigen, en opstellingen en uitslagen invoeren en goedkeuren.",
    steps: [
      { text: "Ga naar Mijn team → Teamleden met account.", hint: { kind: "tab", label: "Mijn team" } },
      { text: "Tik op + Uitnodigen.", hint: { kind: "button", label: "+ Uitnodigen" } },
      { text: "Kies WhatsApp (makkelijkst), E-mail of Link en tik op Maak uitnodiging." },
      { text: "Bij WhatsApp opent de app met een kant-en-klaar bericht: kies het contact en verstuur." },
      { text: "Je teamgenoot opent de link, maakt een account en is direct aanvoerder van je team, net als jij. De link is 7 dagen geldig en werkt één keer." },
      { text: "Staat iemand nog als Teamlid in de lijst? Tik naast de naam op ⋯ en kies Maak aanvoerder." },
      { text: "Iemand stopt? Tik op ⋯ naast zijn naam en kies Uit team verwijderen. Gespeelde uitslagen blijven bewaard." },
    ],
    cta: { label: "Teamgenoten uitnodigen", href: "/team" },
  },
  {
    id: "koppelen",
    title: "Jezelf koppelen aan je speler",
    icon: "link",
    roles: ["member", "captain"],
    intro: "Koppel je account aan je naam in de spelerslijst, zodat je ziet wanneer jij speelt.",
    steps: [
      { text: "Ga naar Mijn team → Spelers.", hint: { kind: "tab", label: "Mijn team" } },
      { text: "Zoek je naam en tik op Dit ben ik.", hint: { kind: "button", label: "Dit ben ik", variant: "outline" } },
      { text: "Sta je er nog niet tussen? Vraag je aanvoerder om je toe te voegen." },
    ],
    cta: { label: "Ga naar Mijn team", href: "/team" },
  },
  {
    id: "opstelling",
    title: "Opstelling invullen",
    icon: "users",
    roles: ["member", "captain"],
    intro: "Per partij kies je welke 2 spelers van jouw team spelen. Dat kan vooraf of op de avond zelf.",
    steps: [
      { text: "Open de wedstrijd via Home of Programma en tik op de wedstrijdkaart." },
      { text: "Tik bij een partij op Opstelling.", hint: { kind: "button", label: "Opstelling", variant: "outline" } },
      { text: "Kies 2 spelers. Je ziet alleen spelers die mogen (bij gemengd 1 dame en 1 heer)." },
      { text: "Invaller die nog niet in de lijst staat? Typ de naam bij + Nieuwe speler en tik op +." },
      { text: "Tik op Opslaan. Staat iemand twee keer in hetzelfde blok, dan krijg je een waarschuwing." },
    ],
    cta: { label: "Bekijk het programma", href: "/schedule" },
  },
  {
    id: "uitslag-invoeren",
    title: "Uitslag invoeren",
    icon: "pencil",
    roles: ["member", "captain"],
    intro: "Na elke partij voert iemand van één van beide teams de uitslag in. De andere ploeg keurt hem daarna goed.",
    steps: [
      { text: "Open de wedstrijd en tik bij de partij op Uitslag invoeren.", hint: { kind: "button", label: "Uitslag invoeren" } },
      { text: "Zet per set de games met − en + (0 t/m 5). Een onafgemaakte set, bijv. 3-2, mag gewoon.", hint: { kind: "stepper" } },
      { text: "Set niet gespeeld? Zet Niet gespeeld aan: dat is ½ punt per team." },
      { text: "Tik op Uitslag versturen. De status wordt Wacht op akkoord.", hint: { kind: "badge", label: "Wacht op akkoord", tone: "warn" } },
      { text: "Foutje? Zolang de tegenstander nog niet akkoord gaf, kun je op Wijzigen tikken." },
    ],
    cta: { label: "Naar de volgende wedstrijd", href: "/" },
  },
  {
    id: "goedkeuren",
    title: "Uitslag goedkeuren of betwisten",
    icon: "check",
    roles: ["member", "captain"],
    intro: "Heeft de tegenstander een uitslag ingevoerd? Dan moet iemand van jouw team die controleren.",
    steps: [
      { text: "Op Home zie je dan het blok Actie nodig. Tik erop.", hint: { kind: "badge", label: "Actie nodig", tone: "warn" } },
      { text: "Klopt de uitslag? Tik op Akkoord. Daarna telt hij mee in de stand en zit hij vast.", hint: { kind: "button", label: "Akkoord" } },
      { text: "Alles in één keer goedkeuren? Tik onderin op Alles akkoord.", hint: { kind: "button", label: "Alles akkoord" } },
      { text: "Klopt het niet? Tik op Betwisten en schrijf kort wat er mis is.", hint: { kind: "button", label: "Betwisten", variant: "danger" } },
      { text: "Na betwisten kan de andere ploeg de uitslag aanpassen en opnieuw versturen. Komen jullie er niet uit, dan beslist de beheerder." },
    ],
    cta: { label: "Naar Home", href: "/" },
  },
  {
    id: "beheer",
    title: "Beheer: seizoen, teams en programma",
    icon: "settings",
    roles: ["admin"],
    intro: "Als beheerder zet je het seizoen klaar. Daarna doen de teams de rest.",
    steps: [
      { text: "Beheer → Overzicht: maak een seizoen aan en kies het aantal banen (4 banen = 1 wedstrijd per tijdslot).", hint: { kind: "tab", label: "Beheer" } },
      { text: "Beheer → Teams: voeg de teams toe. Met het potloodje wijzig je later een teamnaam; programma en uitslagen blijven bewaard." },
      { text: "Tik per team op Aanvoerder uitnodigen en deel de link via WhatsApp of e-mail.", hint: { kind: "button", label: "Aanvoerder uitnodigen", variant: "outline" } },
      { text: "Aanvoerder wisselen? Tik bij Teams op ⋯ naast de aanvoerder: maak hem gewoon teamlid of verwijder hem uit het team. Nodig daarna de nieuwe aanvoerder uit." },
      { text: "Beheer → Programma: voeg speelavonden toe (één datum of elke zaterdag van–tot)." },
      { text: "Kies per avond het tijdslot, het thuis- en uitteam en tik op Wedstrijd inplannen. De 8 partijen worden automatisch aangemaakt." },
      { text: "Betwiste uitslagen zie je op het Overzicht. Open de wedstrijd om te corrigeren of te heropenen." },
      { text: "Beheer → Beheerders: voeg extra beheerders toe." },
    ],
    cta: { label: "Naar Beheer", href: "/admin" },
  },
  {
    id: "beginscherm",
    title: "App op je beginscherm zetten",
    icon: "smartphone",
    roles: ["all"],
    intro: "Zet WinterTennis op je beginscherm, dan open je hem net als een gewone app.",
    steps: [
      { text: "iPhone (Safari): tik op het deel-icoon (vierkant met pijl) → Zet op beginscherm." },
      { text: "Android (Chrome): tik op ⋮ rechtsboven → Toevoegen aan startscherm (of App installeren)." },
    ],
  },
];

export const faq: { q: string; a: string }[] = [
  {
    q: "Ik zie geen knop Uitslag invoeren",
    a: "Je moet ingelogd zijn en lid zijn van één van de twee teams van die wedstrijd. Nog geen account? Vraag je aanvoerder om een uitnodiging.",
  },
  {
    q: "Wanneer telt een uitslag mee in de stand?",
    a: "Pas als de tegenstander op Akkoord heeft getikt. Uitslagen die nog wachten zie je wel bij de wedstrijd, maar niet in de stand.",
  },
  {
    q: "Ik heb per ongeluk Akkoord gegeven",
    a: "Een goedgekeurde uitslag zit vast. Vraag de beheerder om hem te heropenen.",
  },
  {
    q: "We hebben te weinig spelers",
    a: "Voeg een invaller toe als extra speler (Mijn team → Spelers), of typ de naam direct bij Opstelling.",
  },
  {
    q: "Ik ben mijn wachtwoord vergeten",
    a: "Tik bij Inloggen op Wachtwoord vergeten. Je krijgt een link per e-mail, of vraag een beheerder om hulp.",
  },
];

/** Guides for a role. Admins see everything, since they support all teams. */
export function guidesFor(role: HelpRole): Guide[] {
  if (role === "all" || role === "admin") return guides;
  return guides.filter((g) => g.roles.includes("all") || g.roles.includes(role));
}
