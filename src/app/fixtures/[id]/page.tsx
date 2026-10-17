import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser, isMember } from "@/lib/server/auth-guards";
import { getFixture, getTeamPlayers } from "@/lib/server/queries";
import { formatLongDate } from "@/lib/nl";
import { FixtureView } from "./fixture-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = await getFixture((await params).id);
  return { title: f ? `${f.homeTeam.name} – ${f.awayTeam.name}` : "Wedstrijd" };
}

export default async function FixturePage({ params }: Props) {
  const { id } = await params;
  const [fixture, user] = await Promise.all([getFixture(id), getCurrentUser()]);
  if (!fixture) notFound();

  const mySide = user ? (isMember(user, fixture.homeTeamId) ? "HOME" : isMember(user, fixture.awayTeamId) ? "AWAY" : null) : null;
  const myTeamId = mySide === "HOME" ? fixture.homeTeamId : mySide === "AWAY" ? fixture.awayTeamId : null;
  const players = myTeamId ? await getTeamPlayers(myTeamId) : [];
  // Privacy: anonymous visitors only see teams and scores. Player names and dispute comments
  // (free text that may contain names) are stripped server-side so they never reach the browser.
  const showPersonal = Boolean(user);

  return (
    <div>
      <Link href="/schedule" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" /> Programma
      </Link>
      <FixtureView
        fixture={{
          id: fixture.id,
          slot: fixture.slot,
          date: formatLongDate(fixture.evening.date),
          home: fixture.homeTeam,
          away: fixture.awayTeam,
          matches: fixture.matches.map((m) => ({
            id: m.id,
            number: m.number,
            block: m.block,
            type: m.type,
            status: m.status,
            submittedByTeamId: m.submittedByTeamId,
            disputeComment: showPersonal ? m.disputeComment : null,
            sets: m.sets.map((s) => ({ setNo: s.setNo, played: s.played, homeGames: s.homeGames, awayGames: s.awayGames })),
            players: (showPersonal ? m.players : []).map((p) => ({ side: p.side, position: p.position, id: p.player.id, name: p.player.name, gender: p.player.gender })),
          })),
        }}
        viewer={{ loggedIn: Boolean(user), isAdmin: Boolean(user?.isAdmin), side: mySide, teamId: myTeamId }}
        teamPlayers={players}
      />
    </div>
  );
}
