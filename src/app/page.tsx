import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Card, Empty, buttonClass } from "@/components/ui";
import { FixtureCard } from "@/components/fixture-card";
import { StandingsTable } from "@/components/standings-table";
import { Checklist } from "@/components/onboarding/checklist";
import { teamOnboardingSteps } from "@/lib/onboarding";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { getActionsNeeded, getActiveSeason, getSchedule, getStandings, getTeamOnboarding } from "@/lib/server/queries";
import { formatDate, formatLongDate, nl } from "@/lib/nl";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, season] = await Promise.all([getCurrentUser(), getActiveSeason()]);
  if (!season) return <Empty>{nl.noSeason}</Empty>;

  const firstTeam = user?.memberships[0];
  const [evenings, rows, actions, onboarding] = await Promise.all([
    getSchedule(season.id),
    getStandings(season.id),
    user ? getActionsNeeded(user) : Promise.resolve([]),
    user && firstTeam ? getTeamOnboarding(user, firstTeam.teamId) : Promise.resolve(null),
  ]);
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const next = evenings.find((e) => e.date >= today && e.fixtures.length > 0);
  const myTeams = user?.memberships.map((m) => m.teamId) ?? [];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-brand p-5 text-brand-fg shadow-lg">
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-ball/90" aria-hidden />
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full border-[3px] border-white/70 [clip-path:circle(50%)]" aria-hidden />
        <p className="relative text-sm font-medium opacity-80">{season.name}</p>
        <h1 className="relative mt-1 text-2xl font-bold tracking-tight">
          {user ? `Hoi ${user.name?.split(" ")[0] ?? ""} 👋` : nl.appName}
        </h1>
        <p className="relative mt-1 max-w-xs text-sm opacity-90">
          {next ? `Volgende speelavond: ${formatLongDate(next.date)}` : nl.tagline}
        </p>
      </section>

      {user && firstTeam && onboarding && (
        <Checklist steps={teamOnboardingSteps(onboarding)} storageKey={`wt:checklist:${user.id}:${firstTeam.teamId}`} />
      )}

      {actions.length > 0 && (
        <section className="space-y-3" aria-labelledby="actions">
          <h2 id="actions" className="text-lg font-bold">
            Actie nodig
          </h2>
          {actions.map(({ fixture, approve, disputed }) => (
            <Link key={fixture.id} href={`/fixtures/${fixture.id}`} className="block">
              <Card className="flex items-center gap-3 border-warn/40 bg-warn-soft/50 p-4">
                {disputed ? <AlertTriangle className="h-6 w-6 shrink-0 text-danger" /> : <Clock className="h-6 w-6 shrink-0 text-warn" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {fixture.homeTeam.name} – {fixture.awayTeam.name}
                  </div>
                  <div className="text-sm text-muted">
                    {formatDate(fixture.evening.date)} ·{" "}
                    {[approve && `${approve} uitslag${approve > 1 ? "en" : ""} goedkeuren`, disputed && `${disputed} betwist`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted" />
              </Card>
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-3" aria-labelledby="next">
        <div className="flex items-baseline justify-between">
          <h2 id="next" className="text-lg font-bold">
            {next ? formatDate(next.date) : "Programma"}
          </h2>
          <Link href="/schedule" className="text-sm font-semibold text-brand">
            Alle avonden
          </Link>
        </div>
        {next ? (
          <div className="grid gap-3 md:grid-cols-2">
            {next.fixtures.map((f) => (
              <FixtureCard key={f.id} fixture={f} highlightTeamIds={myTeams} />
            ))}
          </div>
        ) : (
          <Empty>Er staan geen speelavonden meer gepland.</Empty>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="stand">
        <div className="flex items-baseline justify-between">
          <h2 id="stand" className="text-lg font-bold">
            {nl.nav.standings}
          </h2>
          <Link href="/standings" className="text-sm font-semibold text-brand">
            Volledige stand
          </Link>
        </div>
        <Card className="overflow-hidden">
          <StandingsTable rows={rows.slice(0, 5)} highlightTeamIds={myTeams} compact />
        </Card>
      </section>

      {!user && (
        <Link href="/login" className={buttonClass("outline", "lg")}>
          Inloggen voor teams
        </Link>
      )}
    </div>
  );
}
