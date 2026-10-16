import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { StatusBadge, fixtureStatus } from "@/components/status-badge";
import { fixturePoints, formatPoints } from "@/lib/scoring";
import { SLOT_HOURS, type Slot } from "@/lib/schedule";
import { cn } from "@/lib/cn";

type Props = {
  fixture: {
    id: string;
    slot: Slot;
    homeTeam: { id: string; name: string };
    awayTeam: { id: string; name: string };
    matches: { status: string; sets: { setNo: number; played: boolean; homeGames: number; awayGames: number }[] }[];
  };
  highlightTeamIds?: string[];
};

export function FixtureCard({ fixture, highlightTeamIds = [] }: Props) {
  const status = fixtureStatus(fixture.matches.map((m) => m.status));
  const pts = fixturePoints(fixture.matches);
  const approved = fixture.matches.filter((m) => m.status === "APPROVED").length;
  const hasScore = approved > 0;
  const mine = (id: string) => highlightTeamIds.includes(id);
  return (
    <Link href={`/fixtures/${fixture.id}`} className="block focus-visible:outline-2 focus-visible:outline-brand rounded-2xl">
      <Card className="flex items-center gap-3 p-4 transition hover:border-brand/40 active:scale-[0.99]">
        <div className="w-14 shrink-0 text-center">
          <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{fixture.slot === "EARLY" ? "Vroeg" : "Laat"}</div>
          <div className="text-xs font-medium tabular-nums leading-tight">
            {SLOT_HOURS[fixture.slot].map((h) => (
              <div key={h}>{h}:00</div>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {[
            { t: fixture.homeTeam, p: pts.home },
            { t: fixture.awayTeam, p: pts.away },
          ].map(({ t, p }, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className={cn("truncate font-semibold", mine(t.id) && "text-brand")}>{t.name}</span>
              {hasScore && <span className="text-lg font-bold tabular-nums">{formatPoints(p)}</span>}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <StatusBadge status={status} />
            {hasScore && approved < 8 && <span className="text-xs text-muted">{approved}/8 akkoord</span>}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
      </Card>
    </Link>
  );
}
