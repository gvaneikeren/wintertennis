import type { Metadata } from "next";
import { Card, Empty, PageHeader } from "@/components/ui";
import { StandingsTable } from "@/components/standings-table";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { getActiveSeason, getStandings } from "@/lib/server/queries";
import { nl } from "@/lib/nl";

export const metadata: Metadata = { title: "Stand" };
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [user, season] = await Promise.all([getCurrentUser(), getActiveSeason()]);
  if (!season) return <Empty>{nl.noSeason}</Empty>;
  const rows = await getStandings(season.id);
  return (
    <div>
      <PageHeader title="Stand" subtitle={season.name} />
      <Card className="overflow-hidden">
        <StandingsTable rows={rows} highlightTeamIds={user?.memberships.map((m) => m.teamId)} />
      </Card>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Per set: meeste games = 1 punt, gelijk of niet gespeeld = ½ punt per team. Alleen uitslagen die door beide teams akkoord zijn tellen mee.
        Bij gelijke punten telt het gamesaldo. Gs = gespeelde avonden.
      </p>
    </div>
  );
}
