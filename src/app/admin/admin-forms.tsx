"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  addEvenings,
  addPairing,
  createSeason,
  createTeam,
  deleteEvening,
  deletePairing,
  removeTeamFromSeason,
  updateSeason,
} from "@/app/actions/admin";

type Res = { ok: true; data?: unknown } | { ok: false; error: string };

function useRun() {
  const [pending, start] = useTransition();
  const exec = (fn: () => Promise<Res>, msg?: string | ((r: Res) => string), after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (msg) toast.success(typeof msg === "function" ? msg(r) : msg);
        after?.();
      } else toast.error(r.error);
    });
  return { pending, exec };
}

export function SeasonForm({ season }: { season: { id: string; name: string; courts: number } | null }) {
  const [name, setName] = useState(season?.name ?? "");
  const [courts, setCourts] = useState(String(season?.courts ?? 4));
  const [creatingNew, setCreatingNew] = useState(!season);
  const { pending, exec } = useRun();
  return (
    <Card className="space-y-3 p-4">
      <Field label="Naam">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Winter 2026–2027" />
      </Field>
      <Field label="Aantal banen" hint="4 banen = 1 wedstrijd per tijdslot (vroeg/laat).">
        <Input type="number" inputMode="numeric" min={4} max={32} step={4} value={courts} onChange={(e) => setCourts(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            creatingNew || !season
              ? exec(() => createSeason({ name, courts }), "Seizoen aangemaakt", () => setCreatingNew(false))
              : exec(() => updateSeason(season.id, { name, courts }), "Opgeslagen")
          }
        >
          {creatingNew || !season ? "Seizoen aanmaken" : "Opslaan"}
        </Button>
        {season && !creatingNew && (
          <Button
            variant="outline"
            onClick={() => {
              setCreatingNew(true);
              setName("");
            }}
          >
            Nieuw seizoen
          </Button>
        )}
      </div>
      {creatingNew && season && <p className="text-xs text-muted">Een nieuw seizoen wordt het actieve seizoen. Teams voeg je daarna opnieuw toe.</p>}
    </Card>
  );
}

export function CreateTeamForm({ seasonId }: { seasonId: string }) {
  const [name, setName] = useState("");
  const { pending, exec } = useRun();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        exec(() => createTeam(seasonId, name), `Team ${name} toegevoegd`, () => setName(""));
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nieuwe teamnaam" maxLength={40} />
      <Button disabled={pending || name.trim().length < 2} aria-label="Team toevoegen">
        <Plus className="h-5 w-5" />
      </Button>
    </form>
  );
}

export function RemoveTeamButton({ seasonId, teamId, name }: { seasonId: string; teamId: string; name: string }) {
  const { pending, exec } = useRun();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`${name} uit seizoen halen`}
      disabled={pending}
      onClick={() => confirm(`${name} uit dit seizoen halen?`) && exec(() => removeTeamFromSeason(seasonId, teamId), "Team verwijderd")}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function AddEveningsForm({ seasonId }: { seasonId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [range, setRange] = useState(false);
  const { pending, exec } = useRun();
  return (
    <Card className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {[false, true].map((r) => (
          <button
            key={String(r)}
            type="button"
            onClick={() => setRange(r)}
            className={cn("h-10 rounded-lg text-sm font-semibold", range === r ? "bg-surface shadow-sm" : "text-muted")}
          >
            {r ? "Elke zaterdag van–tot" : "Eén datum"}
          </button>
        ))}
      </div>
      <div className={cn("grid gap-3", range && "grid-cols-2")}>
        <Field label={range ? "Van" : "Datum"}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        {range && (
          <Field label="Tot en met">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        )}
      </div>
      <Button
        size="lg"
        disabled={pending || !from || (range && !to)}
        onClick={() =>
          exec(
            () => addEvenings(seasonId, { from, to: range ? to : "" }),
            (r) => `${(r as { data?: number }).data ?? 0} avond(en) toegevoegd`,
            () => {
              setFrom("");
              setTo("");
            },
          )
        }
      >
        Speelavond(en) toevoegen
      </Button>
    </Card>
  );
}

export function DeleteEveningButton({ eveningId }: { eveningId: string }) {
  const { pending, exec } = useRun();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => confirm("Deze speelavond verwijderen?") && exec(() => deleteEvening(eveningId), "Avond verwijderd")}
    >
      <Trash2 className="h-4 w-4" /> Avond
    </Button>
  );
}

export function DeletePairingButton({ fixtureId }: { fixtureId: string }) {
  const { pending, exec } = useRun();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Wedstrijd verwijderen"
      disabled={pending}
      onClick={() => confirm("Deze wedstrijd verwijderen?") && exec(() => deletePairing(fixtureId), "Wedstrijd verwijderd")}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function AddPairingForm({
  eveningId,
  freeTeams,
  slots,
}: {
  eveningId: string;
  freeTeams: { id: string; name: string; played: Record<string, number> }[];
  slots: ("EARLY" | "LATE")[];
}) {
  const [slot, setSlot] = useState<"EARLY" | "LATE">(slots[0] ?? "EARLY");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const { pending, exec } = useRun();
  if (slots.length === 0 || freeTeams.length < 2) return null;
  const homeTeam = freeTeams.find((t) => t.id === home);
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["EARLY", "LATE"] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={!slots.includes(s)}
            onClick={() => setSlot(s)}
            className={cn("h-9 rounded-lg text-sm font-semibold disabled:opacity-30", slot === s ? "bg-surface shadow-sm" : "text-muted")}
          >
            {s === "EARLY" ? "19:00 & 21:00" : "20:00 & 22:00"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={home} onChange={(e) => setHome(e.target.value)} aria-label="Thuisteam">
          <option value="">Thuisteam</option>
          {freeTeams.map((t) => (
            <option key={t.id} value={t.id} disabled={t.id === away}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={away} onChange={(e) => setAway(e.target.value)} aria-label="Uitteam">
          <option value="">Uitteam</option>
          {freeTeams.map((t) => (
            <option key={t.id} value={t.id} disabled={t.id === home}>
              {t.name}
              {homeTeam && t.id !== home ? ` (${homeTeam.played[t.id] ?? 0}×)` : ""}
            </option>
          ))}
        </Select>
      </div>
      <Button
        className="w-full"
        disabled={pending || !home || !away || !slots.includes(slot)}
        onClick={() =>
          exec(() => addPairing({ eveningId, slot, homeTeamId: home, awayTeamId: away }), "Wedstrijd ingepland", () => {
            setHome("");
            setAway("");
          })
        }
      >
        <Plus className="h-4 w-4" /> Wedstrijd inplannen
      </Button>
    </div>
  );
}
