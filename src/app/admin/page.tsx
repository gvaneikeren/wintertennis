import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, Empty, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/server/db";
import { getActiveSeason, getAdminOnboarding } from "@/lib/server/queries";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { Checklist } from "@/components/onboarding/checklist";
import { adminOnboardingSteps } from "@/lib/onboarding";
import { formatDate, nl } from "@/lib/nl";
import { SeasonForm } from "./admin-forms";

export const metadata: Metadata = { title: "Beheer" };

export default async function AdminPage() {
  const [season, user, onboarding] = await Promise.all([getActiveSeason(), getCurrentUser(), getAdminOnboarding()]);
  const [teams, evenings, disputed, waiting] = season
    ? await Promise.all([
        prisma.seasonTeam.count({ where: { seasonId: season.id } }),
        prisma.evening.count({ where: { seasonId: season.id } }),
        prisma.match.findMany({
          where: { status: "DISPUTED", fixture: { evening: { seasonId: season.id } } },
          include: { fixture: { include: { evening: true, homeTeam: true, awayTeam: true } } },
        }),
        prisma.match.count({ where: { status: "SUBMITTED", fixture: { evening: { seasonId: season.id } } } }),
      ])
    : [0, 0, [], 0];

  return (
    <div className="space-y-7">
      <PageHeader title="Beheer" subtitle={season?.name ?? "Nog geen seizoen"} />

      <Checklist title="Competitie klaarzetten" steps={adminOnboardingSteps(onboarding)} storageKey={`wt:checklist:admin:${user?.id}`} />

      {season && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Teams", teams],
            ["Avonden", evenings],
            ["Wacht op akkoord", waiting],
          ].map(([label, n]) => (
            <Card key={label} className="p-4">
              <div className="text-2xl font-extrabold tabular-nums">{n}</div>
              <div className="text-xs text-muted">{label}</div>
            </Card>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Geschillen</h2>
        {disputed.length === 0 ? (
          <Empty>Geen betwiste uitslagen.</Empty>
        ) : (
          disputed.map((m) => (
            <Link key={m.id} href={`/fixtures/${m.fixtureId}`} className="block">
              <Card className="flex items-start gap-3 border-danger/40 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <div className="min-w-0">
                  <div className="font-semibold">
                    {m.fixture.homeTeam.name} – {m.fixture.awayTeam.name} · #{m.number} {nl.matchType[m.type]}
                  </div>
                  <div className="text-sm text-muted">{formatDate(m.fixture.evening.date)}</div>
                  {m.disputeComment && <div className="mt-1 text-sm">“{m.disputeComment}”</div>}
                </div>
              </Card>
            </Link>
          ))
        )}
        <p className="text-xs text-muted">
          Open de wedstrijd om de uitslag te corrigeren (wordt direct akkoord) of te heropenen.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{season ? "Seizoen" : "Seizoen aanmaken"}</h2>
        <SeasonForm season={season ? { id: season.id, name: season.name, courts: season.courts } : null} />
      </section>
    </div>
  );
}
