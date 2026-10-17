import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Link2,
  Minus,
  Pencil,
  Plus,
  Send,
  Settings,
  Smartphone,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge, Card, PageHeader, buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { ROLE_LABELS, faq, guidesFor, type Guide, type HelpRole, type Hint } from "@/lib/help";
import { cn } from "@/lib/cn";
import { OpenHash } from "./open-hash";

export const metadata: Metadata = { title: "Uitleg" };

const ICONS: Record<Guide["icon"], LucideIcon> = {
  calendar: CalendarDays,
  "user-plus": UserPlus,
  send: Send,
  link: Link2,
  users: Users,
  pencil: Pencil,
  check: CheckCircle2,
  settings: Settings,
  smartphone: Smartphone,
};

const ROLES: HelpRole[] = ["all", "member", "captain", "admin"];

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ voor?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()]);
  const defaultRole: HelpRole = user?.isAdmin
    ? "admin"
    : user?.memberships.some((m) => m.role === "CAPTAIN")
      ? "captain"
      : user?.memberships.length
        ? "member"
        : "all";
  const role = ROLES.includes(sp.voor as HelpRole) ? (sp.voor as HelpRole) : defaultRole;
  const list = guidesFor(role);

  return (
    <div className="space-y-6">
      <OpenHash />
      <PageHeader title="Uitleg" subtitle="Stap voor stap: zo gebruik je WinterTennis." />

      <nav aria-label="Uitleg voor" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {ROLES.map((r) => (
            <li key={r}>
              <Link
                href={r === defaultRole ? "/help" : `/help?voor=${r}`}
                aria-current={r === role ? "true" : undefined}
                className={cn(
                  "flex h-11 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap",
                  r === role ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted",
                )}
              >
                {ROLE_LABELS[r]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3">
        {list.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </div>

      <section className="space-y-3" aria-labelledby="faq">
        <h2 id="faq" className="text-lg font-bold">
          Veelgestelde vragen
        </h2>
        <Card className="divide-y divide-border">
          {faq.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <p className="px-4 pb-4 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </Card>
      </section>

      <p className="text-center text-sm text-muted">
        Kom je er niet uit? Vraag het je aanvoerder of de beheerder van de competitie.
      </p>
    </div>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  const Icon = ICONS[guide.icon];
  return (
    <Card className="overflow-hidden">
      <details id={guide.id} className="group scroll-mt-20">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{guide.title}</span>
            <span className="block text-xs text-muted">{guide.roles.map((r) => ROLE_LABELS[r]).join(" · ")}</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-border px-4 py-4">
          <p className="text-sm">{guide.intro}</p>
          <ol className="space-y-3">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <p className="text-sm">{s.text}</p>
                  {s.hint && <HintView hint={s.hint} />}
                </div>
              </li>
            ))}
          </ol>
          {guide.cta && (
            <Link href={guide.cta.href} className={buttonClass("primary", "lg")}>
              {guide.cta.label}
            </Link>
          )}
        </div>
      </details>
    </Card>
  );
}

/** Non-interactive replicas of the real controls, so users recognise them in the app. */
function HintView({ hint }: { hint: Hint }) {
  const wrap = "pointer-events-none inline-flex select-none";
  switch (hint.kind) {
    case "button":
      return (
        <span aria-hidden className={cn(wrap, buttonClass(hint.variant ?? "primary", "sm"))}>
          {hint.label}
        </span>
      );
    case "badge":
      return (
        <span aria-hidden className={wrap}>
          <Badge tone={hint.tone}>{hint.label}</Badge>
        </span>
      );
    case "tab":
      return (
        <span aria-hidden className={cn(wrap, "items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand")}>
          Menu → {hint.label}
        </span>
      );
    case "stepper":
      return (
        <span aria-hidden className={cn(wrap, "items-center gap-2 rounded-xl border border-border bg-surface p-1")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
            <Minus className="h-4 w-4" />
          </span>
          <span className="w-5 text-center text-lg font-bold tabular-nums">3</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <Plus className="h-4 w-4" />
          </span>
        </span>
      );
  }
}
