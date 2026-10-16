import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/server/db";
import { getActiveSeason } from "@/lib/server/queries";
import { formatLongDate } from "@/lib/nl";
import { fixturesPerSlot, slotLabel } from "@/lib/schedule";
import { cn } from "@/lib/cn";
import { AddEveningsForm, AddPairingForm, DeleteEveningButton, DeletePairingButton } from "../admin-forms";

export const metadata: Metadata = { title: "Programma beheren" };

export default async function AdminSchedulePage() {
  const season = await getActiveSeason();
  if (!season) return <Empty>Maak eerst een seizoen aan op het overzicht.</Empty>;

  const [seasonTeams, evenings] = await Promise.all([
    prisma.seasonTeam.findMany({ where: { seasonId: season.id }, include: { team: { select: { id: true, name: true } } }, orderBy: { team: { name: "asc" } } }),
    prisma.evening.findMany({
      where: { seasonId: season.id },
      orderBy: { date: "asc" },
      include: {
        fixtures: {
          orderBy: { slot: "asc" },
          include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, matches: { select: { status: true } } },
        },
      },
    }),
  ]);
  const teams = seasonTeams.map((t) => t.team);

  // How often each pair is scheduled, and how many evenings each team plays.
  const pairCount: Record<string, Record<string, number>> = Object.fromEntries(teams.map((t) => [t.id, {}]));
  const evCount: Record<string, number> = {};
  for (const e of evenings)
    for (const f of e.fixtures) {
      for (const [a, b] of [[f.homeTeamId, f.awayTeamId], [f.awayTeamId, f.homeTeamId]]) {
        pairCount[a] ??= {};
        pairCount[a][b] = (pairCount[a][b] ?? 0) + 1;
        evCount[a] = (evCount[a] ?? 0) + 1;
      }
    }
  const perSlot = fixturesPerSlot(season.courts);

  return (
    <div className="space-y-6">
      <PageHeader title="Programma" subtitle={`${evenings.length} avonden · ${season.courts} banen · ${perSlot} wedstrijd(en) per tijdslot`} />
      <AddEveningsForm seasonId={season.id} />

      {teams.length < 2 && <Empty>Voeg eerst minimaal twee teams toe.</Empty>}

      <div className="space-y-4">
        {evenings.map((e) => {
          const busy = new Set(e.fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]));
          const free = teams.filter((t) => !busy.has(t.id));
          const openSlots = (["EARLY", "LATE"] as const).filter((s) => e.fixtures.filter((f) => f.slot === s).length < perSlot);
          return (
            <Card key={e.id} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold capitalize">{formatLongDate(e.date)}</h2>
                <DeleteEveningButton eveningId={e.id} />
              </div>
              {e.fixtures.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="w-24 shrink-0 text-xs font-semibold text-muted">{slotLabel(f.slot)}</span>
                  <Link href={`/fixtures/${f.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {f.homeTeam.name} – {f.awayTeam.name}
                  </Link>
                  {f.matches.every((m) => m.status === "OPEN") && <DeletePairingButton fixtureId={f.id} />}
                </div>
              ))}
              {free.length > 0 && (
                <p className="text-xs text-muted">
                  Vrij: {free.map((t) => t.name).join(", ")}
                </p>
              )}
              <AddPairingForm
                eveningId={e.id}
                slots={[...openSlots]}
                freeTeams={free.map((t) => ({ id: t.id, name: t.name, played: pairCount[t.id] ?? {} }))}
              />
            </Card>
          );
        })}
      </div>

      {teams.length >= 2 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Planningsoverzicht</h2>
          <p className="text-sm text-muted">Hoe vaak teams tegen elkaar zijn ingepland, en het aantal avonden per team.</p>
          <Card className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface p-2" />
                  {teams.map((t) => (
                    <th key={t.id} className="max-w-16 p-2 text-xs font-medium text-muted">
                      <span className="block truncate">{t.name}</span>
                    </th>
                  ))}
                  <th className="p-2 text-xs font-semibold">Avonden</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <th className="sticky left-0 max-w-28 truncate bg-surface p-2 text-left font-semibold">{a.name}</th>
                    {teams.map((b) => {
                      const n = pairCount[a.id]?.[b.id] ?? 0;
                      return (
                        <td
                          key={b.id}
                          className={cn(
                            "p-2 text-center tabular-nums",
                            a.id === b.id ? "bg-surface-2" : n === 0 ? "text-muted" : n === 1 ? "bg-brand-soft font-semibold text-brand" : "bg-warn-soft font-semibold text-warn",
                          )}
                        >
                          {a.id === b.id ? "" : n}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold tabular-nums">{evCount[a.id] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}
