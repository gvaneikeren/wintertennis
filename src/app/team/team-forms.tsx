"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { Button, Card, Field, Input } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { cn } from "@/lib/cn";
import { addPlayer, claimPlayer, removeMember, removePlayer, revokeInvite, setMemberRole, updatePlayer } from "@/app/actions/team";

type Res = { ok: true } | { ok: false; error: string };

function useRun() {
  const [pending, start] = useTransition();
  const exec = (fn: () => Promise<Res>, msg?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (msg) toast.success(msg);
        after?.();
      } else toast.error(r.error);
    });
  return { pending, exec };
}

function GenderToggle({ value, onChange }: { value: "F" | "M"; onChange: (g: "F" | "M") => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Geslacht">
      {(["F", "M"] as const).map((g) => (
        <button
          key={g}
          type="button"
          role="radio"
          aria-checked={value === g}
          onClick={() => onChange(g)}
          className={cn("h-10 rounded-lg text-sm font-semibold", value === g ? "bg-surface shadow-sm" : "text-muted")}
        >
          {g === "F" ? "Dame" : "Heer"}
        </button>
      ))}
    </div>
  );
}

export function AddPlayerForm({ teamId }: { teamId: string }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"F" | "M">("F");
  const { pending, exec } = useRun();
  return (
    <Card className="space-y-3 p-4">
      <div className="text-sm font-semibold">Speler toevoegen</div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          exec(() => addPlayer(teamId, { name, gender }), `${name} toegevoegd`, () => setName(""));
        }}
      >
        <Input placeholder="Naam" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />
        <GenderToggle value={gender} onChange={setGender} />
        <Button size="lg" disabled={pending || name.trim().length < 2}>
          <UserPlus className="h-5 w-5" /> Toevoegen
        </Button>
      </form>
    </Card>
  );
}

export function PlayerActions({ player }: { player: { id: string; name: string; gender: "F" | "M" } }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(player.name);
  const [gender, setGender] = useState(player.gender);
  const { pending, exec } = useRun();
  return (
    <>
      <Button variant="ghost" size="icon" aria-label={`${player.name} bewerken`} onClick={() => setOpen(true)}>
        <MoreHorizontal className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Speler bewerken">
        <div className="space-y-3">
          <Field label="Naam">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <GenderToggle value={gender} onChange={setGender} />
          <Button size="lg" disabled={pending} onClick={() => exec(() => updatePlayer(player.id, { name, gender }), "Opgeslagen", () => setOpen(false))}>
            Opslaan
          </Button>
          <Button
            variant="danger"
            size="lg"
            disabled={pending}
            onClick={() => confirm(`${player.name} verwijderen?`) && exec(() => removePlayer(player.id), "Speler verwijderd", () => setOpen(false))}
          >
            Verwijderen
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export function ClaimButton({ playerId }: { playerId: string }) {
  const { pending, exec } = useRun();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => exec(() => claimPlayer(playerId), "Gekoppeld aan jouw account")}>
      Dit ben ik
    </Button>
  );
}

export function MemberActions({
  teamId,
  userId,
  role,
  name,
}: {
  teamId: string;
  userId: string;
  role: "CAPTAIN" | "MEMBER";
  name?: string;
}) {
  const who = name ?? (role === "CAPTAIN" ? "Aanvoerder" : "Lid");
  const [open, setOpen] = useState(false);
  const { pending, exec } = useRun();
  return (
    <>
      <Button variant="ghost" size="icon" aria-label={name ? `${name} beheren` : "Lid beheren"} onClick={() => setOpen(true)}>
        <MoreHorizontal className="h-5 w-5" />
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={role === "CAPTAIN" ? "Aanvoerder beheren" : "Teamlid beheren"}
        description={name ? `${name}. Spelers, programma en uitslagen blijven bewaard.` : undefined}
      >
        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={() =>
              exec(() => setMemberRole(teamId, userId, role === "CAPTAIN" ? "MEMBER" : "CAPTAIN"), "Rol aangepast", () => setOpen(false))
            }
          >
            {role === "CAPTAIN" ? "Maak gewoon teamlid" : "Maak aanvoerder"}
          </Button>
          <Button
            variant="danger"
            size="lg"
            disabled={pending}
            onClick={() =>
              confirm(`${who} uit het team verwijderen? Diegene kan daarna niets meer invoeren voor dit team.`) &&
              exec(() => removeMember(teamId, userId), `${who} verwijderd`, () => setOpen(false))
            }
          >
            Uit team verwijderen
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const { pending, exec } = useRun();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => exec(() => revokeInvite(inviteId), "Uitnodiging ingetrokken")}>
      Intrekken
    </Button>
  );
}
