import type { Metadata } from "next";
import { Empty, PageHeader } from "@/components/ui";
import { FixtureCard } from "@/components/fixture-card";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { getActiveSeason, getSchedule } from "@/lib/server/queries";
import { formatDate, formatLongDate, nl } from "@/lib/nl";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Programma" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [user, season] = await Promise.all([getCurrentUser(), getActiveSeason()]);
  if (!season) return <Empty>{nl.noSeason}</Empty>;
  const evenings = await getSchedule(season.id);
  const myTeams = user?.memberships.map((m) => m.teamId) ?? [];
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const nextId = evenings.find((e) => e.date >= today)?.id;

  return (
    <div>
      <PageHeader title="Programma" subtitle={`${season.name} · ${evenings.length} speelavonden`} />
      {evenings.length === 0 ? (
        <Empty>Er zijn nog geen speelavonden gepland.</Empty>
      ) : (
        <>
          <nav aria-label="Speelavonden" className="sticky top-14 z-20 -mx-4 mb-4 bg-bg/90 px-4 py-2 backdrop-blur-lg">
            <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {evenings.map((e) => {
                const past = e.date < today;
                return (
                  <li key={e.id}>
                    <a
                      href={`#e-${e.id}`}
                      className={cn(
                        "flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                        e.id === nextId ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface",
                        past && "text-muted",
                      )}
                    >
                      {formatDate(e.date)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="space-y-7">
            {evenings.map((e) => (
              <section key={e.id} id={`e-${e.id}`} className="scroll-mt-32 space-y-3">
                <h2 className="text-base font-bold capitalize">{formatLongDate(e.date)}</h2>
                {e.fixtures.length === 0 ? (
                  <Empty>Nog geen wedstrijden ingedeeld.</Empty>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {e.fixtures.map((f) => (
                      <FixtureCard key={f.id} fixture={f} highlightTeamIds={myTeams} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
