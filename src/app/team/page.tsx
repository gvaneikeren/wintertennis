import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Badge, Card, Empty, PageHeader } from "@/components/ui";
import { FixtureCard } from "@/components/fixture-card";
import { InviteShare } from "@/components/invite-share";
import { getCurrentUser, isCaptain } from "@/lib/server/auth-guards";
import { prisma } from "@/lib/server/db";
import { getActiveSeason } from "@/lib/server/queries";
import { formatDate, nl } from "@/lib/nl";
import { cn } from "@/lib/cn";
import { AddPlayerForm, ClaimButton, MemberActions, PlayerActions, RevokeInviteButton } from "./team-forms";

export const metadata: Metadata = { title: "Mijn team" };
export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ team?: string; invite?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/team");

  if (user.memberships.length === 0) {
    return (
      <div>
        <PageHeader title="Mijn team" />
        <Empty>
          Je bent nog geen lid van een team. Vraag je aanvoerder om een uitnodiging.
          {user.isAdmin && (
            <>
              {" "}
              <Link href="/admin/teams" className="font-semibold text-brand">
                Naar teambeheer
              </Link>
            </>
          )}
        </Empty>
      </div>
    );
  }

  const membership = user.memberships.find((m) => m.teamId === sp.team) ?? user.memberships[0];
  const teamId = membership.teamId;
  const captain = isCaptain(user, teamId) || user.isAdmin;
  const season = await getActiveSeason();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

  const [team, fixtures] = await Promise.all([
    prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      include: {
        players: { where: { active: true }, orderBy: { name: "asc" } },
        memberships: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } },
        invites: captain
          ? { where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }
          : false,
      },
    }),
    season
      ? prisma.fixture.findMany({
          where: { evening: { seasonId: season.id, date: { gte: today } }, OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
          include: {
            evening: true,
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
            matches: { select: { status: true, sets: { select: { setNo: true, played: true, homeGames: true, awayGames: true } } } },
          },
          orderBy: { evening: { date: "asc" } },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  const ladies = team.players.filter((p) => p.gender === "F");
  const men = team.players.filter((p) => p.gender === "M");
  const myPlayerId = team.players.find((p) => p.userId === user.id)?.id;

  return (
    <div className="space-y-7">
      <PageHeader
        title={team.name}
        subtitle={<Badge tone={membership.role === "CAPTAIN" ? "brand" : "neutral"}>{nl.role[membership.role]}</Badge>}
      />

      {sp.invite === "invalid" && <Alert>De uitnodiging was ongeldig of verlopen.</Alert>}

      {user.memberships.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {user.memberships.map((m) => (
            <Link
              key={m.teamId}
              href={`/team?team=${m.teamId}`}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", m.teamId === teamId ? "border-brand bg-brand text-brand-fg" : "border-border")}
            >
              {m.team.name}
            </Link>
          ))}
        </div>
      )}

      {fixtures.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Komende wedstrijden</h2>
          {fixtures.map((f) => (
            <div key={f.id}>
              <div className="mb-1.5 text-sm font-medium text-muted capitalize">{formatDate(f.evening.date)}</div>
              <FixtureCard fixture={f} highlightTeamIds={[teamId]} />
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Spelers</h2>
          <span className={cn("text-sm", ladies.length >= 4 && men.length >= 4 ? "text-muted" : "font-semibold text-warn")}>
            {ladies.length} dames · {men.length} heren
          </span>
        </div>
        {(ladies.length < 4 || men.length < 4) && (
          <Alert tone="warn">Een team heeft minimaal 4 dames en 4 heren nodig.</Alert>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["F", ladies],
            ["M", men],
          ] as const).map(([g, list]) => (
            <Card key={g} className="p-2">
              <div className="px-2 pt-1 pb-2 text-xs font-semibold text-muted uppercase">{nl.genderPlural[g]}</div>
              {list.length === 0 && <div className="px-2 pb-2 text-sm text-muted">Nog geen spelers</div>}
              <ul>
                {list.map((p) => (
                  <li key={p.id} className="flex min-h-12 items-center justify-between gap-2 rounded-xl px-2 hover:bg-surface-2">
                    <span className="font-medium">
                      {p.name}
                      {p.id === myPlayerId && (
                        <Badge tone="brand" className="ml-2">
                          jij
                        </Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      {!myPlayerId && !p.userId && <ClaimButton playerId={p.id} />}
                      {captain && <PlayerActions player={{ id: p.id, name: p.name, gender: p.gender }} />}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <AddPlayerForm teamId={teamId} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Teamleden met account</h2>
          {captain && <InviteShare teamId={teamId} teamName={team.name} role="MEMBER" label="+ Uitnodigen" />}
        </div>
        <p className="text-sm text-muted">Teamleden kunnen opstellingen en uitslagen invoeren en uitslagen van de tegenstander goedkeuren.</p>
        <Card className="divide-y divide-border">
          {team.memberships.map((m) => (
            <div key={m.userId} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.user.name ?? m.user.email}</div>
                <div className="truncate text-xs text-muted">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={m.role === "CAPTAIN" ? "brand" : "neutral"}>{nl.role[m.role]}</Badge>
                {captain && m.userId !== user.id && <MemberActions teamId={teamId} userId={m.userId} role={m.role} />}
              </div>
            </div>
          ))}
        </Card>
        {captain && team.invites && team.invites.length > 0 && (
          <Card className="divide-y divide-border">
            <div className="px-4 py-2 text-xs font-semibold text-muted uppercase">Openstaande uitnodigingen</div>
            {team.invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{i.email ?? i.phone ?? "Link"}</div>
                  <div className="text-xs text-muted">
                    {nl.role[i.role]} · geldig t/m {formatDate(i.expiresAt)}
                  </div>
                </div>
                <RevokeInviteButton inviteId={i.id} />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
