import { formatPoints } from "@/lib/scoring";
import { cn } from "@/lib/cn";

type Row = { teamId: string; name: string; played: number; points: number; setsWon: number; gamesWon: number; gamesLost: number };

export function StandingsTable({ rows, highlightTeamIds = [], compact = false }: { rows: Row[]; highlightTeamIds?: string[]; compact?: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="w-8 py-2 pl-4 font-medium">#</th>
          <th className="py-2 font-medium">Team</th>
          <th className="w-10 py-2 text-center font-medium" title="Gespeelde avonden">
            Gs
          </th>
          {!compact && (
            <>
              <th className="hidden w-14 py-2 text-center font-medium sm:table-cell" title="Gewonnen sets">
                Sets
              </th>
              <th className="hidden w-20 py-2 text-center font-medium sm:table-cell" title="Games voor – tegen">
                Games
              </th>
            </>
          )}
          <th className="w-16 py-2 pr-4 text-right font-medium">Ptn</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.teamId} className={cn("border-t border-border", highlightTeamIds.includes(r.teamId) && "bg-brand-soft/60")}>
            <td className="py-3 pl-4">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  i === 0 ? "bg-ball text-black" : "text-muted",
                )}
              >
                {i + 1}
              </span>
            </td>
            <td className="py-3 font-semibold">
              {r.name}
              {!compact && (
                <span className="block text-xs font-normal text-muted sm:hidden">
                  {r.setsWon} sets · games {r.gamesWon}–{r.gamesLost}
                </span>
              )}
            </td>
            <td className="py-3 text-center tabular-nums text-muted">{r.played}</td>
            {!compact && (
              <>
                <td className="hidden py-3 text-center tabular-nums sm:table-cell">{r.setsWon}</td>
                <td className="hidden py-3 text-center tabular-nums sm:table-cell">
                  {r.gamesWon}–{r.gamesLost}
                </td>
              </>
            )}
            <td className="py-3 pr-4 text-right text-base font-bold tabular-nums">{formatPoints(r.points)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
