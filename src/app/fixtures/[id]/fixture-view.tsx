"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, CheckCheck, Minus, Pencil, Plus, RotateCcw, UserPlus, Users, X } from "lucide-react";
import { Alert, Badge, Button, Card, Input } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { Tip } from "@/components/onboarding/tip";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/cn";
import { nl } from "@/lib/nl";
import { fixturePoints, formatPoints, matchPoints, validateSet, type SetScore } from "@/lib/scoring";
import { blockTime, type MatchType, type Slot } from "@/lib/schedule";
import { allowedGender, doubleBooked, type Gender } from "@/lib/lineup";
import { approveAll, approveScore, disputeScore, reopenScore, saveLineup, submitScore } from "@/app/actions/score";
import { addPlayer } from "@/app/actions/team";

type Side = "HOME" | "AWAY";
type Status = "OPEN" | "SUBMITTED" | "APPROVED" | "DISPUTED";
type PlayerRef = { id: string; name: string; gender: Gender };
type MatchData = {
  id: string;
  number: number;
  block: number;
  type: MatchType;
  status: Status;
  submittedByTeamId: string | null;
  disputeComment: string | null;
  sets: (SetScore & { setNo: number })[];
  players: (PlayerRef & { side: Side; position: number })[];
};
type FixtureData = {
  id: string;
  slot: Slot;
  date: string;
  home: { id: string; name: string };
  away: { id: string; name: string };
  matches: MatchData[];
};
type Viewer = { loggedIn: boolean; isAdmin: boolean; side: Side | null; teamId: string | null };

type Result = { ok: true } | { ok: false; error: string };
function useAction() {
  const [pending, start] = useTransition();
  const exec = (fn: () => Promise<Result>, success?: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (success) toast.success(success);
        after?.();
      } else toast.error(res.error);
    });
  return { pending, exec };
}

export function FixtureView({ fixture, viewer, teamPlayers }: { fixture: FixtureData; viewer: Viewer; teamPlayers: PlayerRef[] }) {
  const [players, setPlayers] = useState(teamPlayers);
  const { pending, exec } = useAction();
  const approved = fixturePoints(fixture.matches);
  const pendingPts = fixturePoints(fixture.matches, true);
  const toApprove = fixture.matches.filter(
    (m) => m.status === "SUBMITTED" && viewer.teamId && m.submittedByTeamId !== viewer.teamId,
  ).length;
  const booked = useMemo(
    () =>
      doubleBooked(
        fixture.matches.map((m) => ({ block: m.block, playerIds: m.players.filter((p) => p.side === viewer.side).map((p) => p.id) })),
      ),
    [fixture.matches, viewer.side],
  );
  const blocks = [1, 2].map((b) => fixture.matches.filter((m) => m.block === b));

  return (
    <div className="pb-20">
      {/* Scoreboard */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-brand px-4 py-2 text-center text-xs font-semibold tracking-wide text-brand-fg uppercase">
          {fixture.date} · {fixture.slot === "EARLY" ? "19:00 – 22:00" : "20:00 – 23:00"}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4">
          <TeamName name={fixture.home.name} mine={viewer.side === "HOME"} />
          <div className="text-center">
            <div className="text-3xl font-extrabold tabular-nums">
              {formatPoints(approved.home)} <span className="text-muted">–</span> {formatPoints(approved.away)}
            </div>
            {(pendingPts.home !== approved.home || pendingPts.away !== approved.away) && (
              <div className="text-xs text-muted">
                incl. wachtend: {formatPoints(pendingPts.home)} – {formatPoints(pendingPts.away)}
              </div>
            )}
          </div>
          <TeamName name={fixture.away.name} mine={viewer.side === "AWAY"} right />
        </div>
      </Card>

      {!viewer.loggedIn && (
        <div className="mb-5">
          <Alert tone="info">Log in om opstellingen en uitslagen in te voeren.</Alert>
        </div>
      )}

      {viewer.side && toApprove > 0 && (
        <div className="mb-5">
          <Tip id="fixture-approve" title="De tegenstander wacht op jouw akkoord" help="goedkeuren">
            Klopt de uitslag? Tik op <strong>Akkoord</strong>, of onderin op <strong>Alles akkoord</strong>. Klopt er iets niet? Tik op{" "}
            <strong>Betwisten</strong> en schrijf kort wat er mis is.
          </Tip>
        </div>
      )}
      {viewer.side && toApprove === 0 && (
        <div className="mb-5">
          <Tip id="fixture-enter" title="Zo vul je deze wedstrijd in" help="uitslag-invoeren">
            Tik per partij op <strong>Opstelling</strong> om je spelers te kiezen. Na de partij tik je op <strong>Uitslag invoeren</strong>. De
            andere ploeg keurt je uitslag daarna goed.
          </Tip>
        </div>
      )}

      {blocks.map((ms, i) => (
        <section key={i} className="mb-7 space-y-3">
          <h2 className="flex items-baseline justify-between text-base font-bold">
            {i === 0 ? "Voor de pauze · Gemengd" : "Na de pauze · Dames & Heren"}
            <span className="text-sm font-medium text-muted">{blockTime(fixture.slot, i + 1)}</span>
          </h2>
          {ms.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              fixture={fixture}
              viewer={viewer}
              players={players}
              onPlayerAdded={(p) => setPlayers((ps) => [...ps, p])}
              doubleBooked={booked}
              blockMatches={ms}
            />
          ))}
        </section>
      ))}

      {toApprove > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 md:bottom-4">
          <div className="mx-auto max-w-lg">
            <Button
              size="lg"
              className="shadow-xl"
              disabled={pending}
              onClick={() =>
                exec(async () => {
                  const r = await approveAll(fixture.id);
                  return r.ok ? { ok: true } : r;
                }, "Uitslagen goedgekeurd")
              }
            >
              <CheckCheck className="h-5 w-5" /> {nl.actions.approveAll} ({toApprove})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamName({ name, mine, right }: { name: string; mine: boolean; right?: boolean }) {
  return (
    <div className={cn("min-w-0", right && "text-right")}>
      <div className={cn("truncate text-base font-bold", mine && "text-brand")}>{name}</div>
      {mine && <Badge tone="brand">Jouw team</Badge>}
    </div>
  );
}

function MatchCard({
  match,
  fixture,
  viewer,
  players,
  onPlayerAdded,
  doubleBooked,
  blockMatches,
}: {
  match: MatchData;
  fixture: FixtureData;
  viewer: Viewer;
  players: PlayerRef[];
  onPlayerAdded: (p: PlayerRef) => void;
  doubleBooked: Set<string>;
  blockMatches: MatchData[];
}) {
  const [editing, setEditing] = useState(false);
  const [lineupOpen, setLineupOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const { pending, exec } = useAction();

  const participant = Boolean(viewer.side) || viewer.isAdmin;
  const ownSubmission = match.submittedByTeamId !== null && match.submittedByTeamId === viewer.teamId;
  const canEnter =
    participant &&
    (match.status === "OPEN" || match.status === "DISPUTED" || (match.status === "SUBMITTED" && (ownSubmission || viewer.isAdmin)));
  const canReview = match.status === "SUBMITTED" && viewer.side !== null && !ownSubmission;
  const canEditLineup = viewer.side !== null && match.status !== "APPROVED";
  const hasScore = match.status !== "OPEN";
  const pts = matchPoints(match.sets);
  const side = (s: Side) => match.players.filter((p) => p.side === s).sort((a, b) => a.position - b.position);

  return (
    <Card data-match={match.number} className={cn("p-4", match.status === "DISPUTED" && "border-danger/50")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          <span className="mr-1.5 text-muted">#{match.number}</span>
          {nl.matchType[match.type]}
        </div>
        <StatusBadge status={match.status} />
      </div>

      {/* Line-ups */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {(["HOME", "AWAY"] as const).map((s) => {
          const ps = side(s);
          return (
            <div key={s} className={cn("min-w-0 rounded-xl bg-surface-2 px-3 py-2", s === "AWAY" && "text-right")}>
              <div className="truncate text-[11px] font-semibold text-muted uppercase">{s === "HOME" ? fixture.home.name : fixture.away.name}</div>
              {ps.length ? (
                ps.map((p) => (
                  <div key={p.id} className={cn("truncate font-medium", s === viewer.side && doubleBooked.has(p.id) && "text-warn")}>
                    {p.name}
                  </div>
                ))
              ) : (
                <div className="text-muted italic">Nog niet bekend</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Score summary */}
      {hasScore && !editing && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
          <div className="flex gap-3 text-sm tabular-nums">
            {match.sets.map((s) => (
              <span key={s.setNo} className={cn("font-semibold", !s.played && "text-muted")}>
                {s.played ? `${s.homeGames}-${s.awayGames}` : "n.g."}
              </span>
            ))}
          </div>
          <div className="text-lg font-bold tabular-nums">
            {formatPoints(pts.home)} – {formatPoints(pts.away)}
          </div>
        </div>
      )}

      {match.status === "DISPUTED" && match.disputeComment && (
        <div className="mt-3">
          <Alert>Betwist: {match.disputeComment}</Alert>
        </div>
      )}

      {editing && (
        <ScoreEditor
          match={match}
          homeName={fixture.home.name}
          awayName={fixture.away.name}
          onCancel={() => setEditing(false)}
          onDone={() => setEditing(false)}
        />
      )}

      {/* Actions */}
      {!editing && (canEditLineup || canEnter || canReview || (viewer.isAdmin && hasScore)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canReview && (
            <>
              <Button className="flex-1" disabled={pending} onClick={() => exec(() => approveScore(match.id), "Uitslag goedgekeurd")}>
                <Check className="h-4 w-4" /> {nl.actions.approve}
              </Button>
              <Button variant="danger" className="flex-1" disabled={pending} onClick={() => setDisputeOpen(true)}>
                <X className="h-4 w-4" /> {nl.actions.dispute}
              </Button>
            </>
          )}
          {canEditLineup && (
            <Button variant="outline" size="sm" onClick={() => setLineupOpen(true)}>
              <Users className="h-4 w-4" /> Opstelling
            </Button>
          )}
          {canEnter && (
            <Button variant={hasScore ? "outline" : "primary"} size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> {hasScore ? "Wijzigen" : "Uitslag invoeren"}
            </Button>
          )}
          {viewer.isAdmin && hasScore && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => exec(() => reopenScore(match.id), "Uitslag heropend")}>
              <RotateCcw className="h-4 w-4" /> {nl.actions.reopen}
            </Button>
          )}
        </div>
      )}
      {match.status === "SUBMITTED" && ownSubmission && (
        <p className="mt-2 text-xs text-muted">Wacht op akkoord van de tegenstander.</p>
      )}

      {viewer.side && (
        <LineupSheet
          open={lineupOpen}
          onOpenChange={setLineupOpen}
          match={match}
          side={viewer.side}
          teamId={viewer.teamId!}
          players={players}
          onPlayerAdded={onPlayerAdded}
          usedInBlock={new Set(
            blockMatches.filter((m) => m.id !== match.id).flatMap((m) => m.players.filter((p) => p.side === viewer.side).map((p) => p.id)),
          )}
        />
      )}
      <DisputeSheet open={disputeOpen} onOpenChange={setDisputeOpen} matchId={match.id} />
    </Card>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`${label} min één`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 active:scale-95 disabled:opacity-30"
      >
        <Minus className="h-5 w-5" />
      </button>
      <output aria-live="polite" className="w-8 text-center text-2xl font-bold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label={`${label} plus één`}
        disabled={value >= 5}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 active:scale-95 disabled:opacity-30"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function ScoreEditor({
  match,
  homeName,
  awayName,
  onCancel,
  onDone,
}: {
  match: MatchData;
  homeName: string;
  awayName: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const initial: SetScore[] = [1, 2, 3].map((n) => {
    const s = match.sets.find((x) => x.setNo === n);
    return s ? { played: s.played, homeGames: s.homeGames, awayGames: s.awayGames } : { played: true, homeGames: 0, awayGames: 0 };
  });
  const [sets, setSets] = useState<SetScore[]>(initial);
  const { pending, exec } = useAction();
  const errors = sets.map(validateSet);
  const pts = matchPoints(sets);
  const update = (i: number, patch: Partial<SetScore>) => setSets((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <div className="mt-4 space-y-3">
      {sets.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">
              {nl.set} {i + 1}
            </span>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--brand)]"
                checked={!s.played}
                onChange={(e) => update(i, { played: !e.target.checked })}
              />
              {nl.notPlayed}
            </label>
          </div>
          {s.played ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="max-w-full truncate text-xs text-muted">{homeName}</span>
                <Stepper value={s.homeGames} onChange={(v) => update(i, { homeGames: v })} label={`Set ${i + 1} ${homeName}`} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="max-w-full truncate text-xs text-muted">{awayName}</span>
                <Stepper value={s.awayGames} onChange={(v) => update(i, { awayGames: v })} label={`Set ${i + 1} ${awayName}`} />
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted">½ punt voor beide teams</p>
          )}
          {errors[i] && <p className="mt-2 text-center text-sm font-medium text-danger">{errors[i]}</p>}
        </div>
      ))}
      <div className="flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3 text-brand">
        <span className="text-sm font-semibold">Punten</span>
        <span className="text-xl font-extrabold tabular-nums">
          {formatPoints(pts.home)} – {formatPoints(pts.away)}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={pending}>
          {nl.actions.cancel}
        </Button>
        <Button
          className="flex-[2]"
          disabled={pending || errors.some(Boolean)}
          onClick={() => exec(() => submitScore(match.id, sets), "Uitslag verstuurd", onDone)}
        >
          {nl.actions.submit}
        </Button>
      </div>
    </div>
  );
}

function LineupSheet({
  open,
  onOpenChange,
  match,
  side,
  teamId,
  players,
  onPlayerAdded,
  usedInBlock,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  match: MatchData;
  side: Side;
  teamId: string;
  players: PlayerRef[];
  onPlayerAdded: (p: PlayerRef) => void;
  usedInBlock: Set<string>;
}) {
  const current = match.players.filter((p) => p.side === side).sort((a, b) => a.position - b.position);
  const [picked, setPicked] = useState<(string | null)[]>([current[0]?.id ?? null, current[1]?.id ?? null]);
  const [newName, setNewName] = useState<[string, string]>(["", ""]);
  const { pending, exec } = useAction();

  const pickFor = (pos: 0 | 1, id: string) => setPicked((p) => (pos === 0 ? [id, p[1] === id ? null : p[1]] : [p[0] === id ? null : p[0], id]));

  const add = (pos: 0 | 1, gender: Gender) =>
    exec(async () => {
      const r = await addPlayer(teamId, { name: newName[pos], gender });
      if (r.ok && r.data) {
        onPlayerAdded(r.data as PlayerRef);
        pickFor(pos, r.data.id);
        setNewName((n) => (pos === 0 ? ["", n[1]] : [n[0], ""]));
      }
      return r.ok ? { ok: true } : r;
    }, "Speler toegevoegd");

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Opstelling #${match.number}`} description={nl.matchType[match.type]}>
      <div className="space-y-5">
        {([0, 1] as const).map((pos) => {
          const g = allowedGender(match.type, (pos + 1) as 1 | 2);
          const options = players.filter((p) => p.gender === g);
          return (
            <div key={pos}>
              <div className="mb-2 text-sm font-semibold">
                Speler {pos + 1} · {nl.gender[g]}
              </div>
              <div className="flex flex-wrap gap-2">
                {options.map((p) => {
                  const on = picked[pos] === p.id;
                  const other = picked[pos === 0 ? 1 : 0] === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={other}
                      onClick={() => pickFor(pos, p.id)}
                      aria-pressed={on}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-sm font-medium transition",
                        on ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface",
                        !on && usedInBlock.has(p.id) && "text-muted",
                        other && "opacity-30",
                      )}
                    >
                      {p.name}
                      {!on && usedInBlock.has(p.id) && <span className="ml-1 text-xs">(speelt al)</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder={`+ Nieuwe ${g === "F" ? "speelster" : "speler"}`}
                  value={newName[pos]}
                  onChange={(e) => setNewName((n) => (pos === 0 ? [e.target.value, n[1]] : [n[0], e.target.value]))}
                  maxLength={60}
                  className="h-11"
                />
                <Button variant="outline" size="icon" aria-label="Speler toevoegen" disabled={pending || newName[pos].trim().length < 2} onClick={() => add(pos, g)}>
                  <UserPlus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button
          size="lg"
          disabled={pending || !picked[0] || !picked[1]}
          onClick={() => exec(() => saveLineup(match.id, picked), "Opstelling opgeslagen", () => onOpenChange(false))}
        >
          {nl.actions.save}
        </Button>
      </div>
    </Sheet>
  );
}

function DisputeSheet({ open, onOpenChange, matchId }: { open: boolean; onOpenChange: (o: boolean) => void; matchId: string }) {
  const [comment, setComment] = useState("");
  const { pending, exec } = useAction();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Uitslag betwisten" description="Laat de tegenstander weten wat er niet klopt.">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={4}
        placeholder="Bijv. set 2 was 4-3 in plaats van 3-4"
        className="w-full rounded-xl border border-border bg-surface p-3 text-base focus:outline-2 focus:outline-brand"
      />
      <Button
        variant="danger"
        size="lg"
        className="mt-3"
        disabled={pending || comment.trim().length < 3}
        onClick={() => exec(() => disputeScore(matchId, comment), "Uitslag betwist", () => onOpenChange(false))}
      >
        {nl.actions.dispute}
      </Button>
    </Sheet>
  );
}
