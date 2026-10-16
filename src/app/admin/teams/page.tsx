import type { Metadata } from "next";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { InviteShare } from "@/components/invite-share";
import { RevokeInviteButton } from "@/app/team/team-forms";
import { prisma } from "@/lib/server/db";
import { getActiveSeason } from "@/lib/server/queries";
import { formatDate } from "@/lib/nl";
import { CreateTeamForm, RemoveTeamButton } from "../admin-forms";

export const metadata: Metadata = { title: "Teams" };

export default async function AdminTeamsPage() {
  const season = await getActiveSeason();
  if (!season) return <Empty>Maak eerst een seizoen aan op het overzicht.</Empty>;
  const teams = await prisma.seasonTeam.findMany({
    where: { seasonId: season.id },
    include: {
      team: {
        include: {
          memberships: { where: { role: "CAPTAIN" }, include: { user: { select: { name: true, email: true } } } },
          players: { where: { active: true }, select: { gender: true } },
          invites: { where: { role: "CAPTAIN", acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } },
          _count: { select: { memberships: true } },
        },
      },
    },
    orderBy: { team: { name: "asc" } },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Teams" subtitle={`${teams.length} teams in ${season.name}`} />
      <CreateTeamForm seasonId={season.id} />
      {teams.length === 0 && <Empty>Nog geen teams. Voeg hierboven het eerste team toe.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        {teams.map(({ team }) => {
          const f = team.players.filter((p) => p.gender === "F").length;
          const m = team.players.length - f;
          return (
            <Card key={team.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-bold">{team.name}</div>
                  <div className="text-xs text-muted">
                    {f} dames · {m} heren · {team._count.memberships} accounts
                  </div>
                </div>
                <RemoveTeamButton seasonId={season.id} teamId={team.id} name={team.name} />
              </div>
              <div className="space-y-1">
                {team.memberships.length === 0 ? (
                  <Badge tone="warn">Nog geen aanvoerder</Badge>
                ) : (
                  team.memberships.map((c) => (
                    <div key={c.userId} className="text-sm">
                      <Badge tone="brand" className="mr-2">
                        Aanvoerder
                      </Badge>
                      {c.user.name ?? c.user.email}
                    </div>
                  ))
                )}
                {team.invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm text-muted">
                    <span className="truncate">
                      Uitgenodigd: {i.email ?? i.phone ?? "link"} (t/m {formatDate(i.expiresAt)})
                    </span>
                    <RevokeInviteButton inviteId={i.id} />
                  </div>
                ))}
              </div>
              <InviteShare teamId={team.id} teamName={team.name} role="CAPTAIN" label="Aanvoerder uitnodigen" variant="outline" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
