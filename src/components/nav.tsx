"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Settings, Trophy, Users, LogIn } from "lucide-react";
import { cn } from "@/lib/cn";
import { nl } from "@/lib/nl";

function items(loggedIn: boolean, isAdmin: boolean) {
  return [
    { href: "/", label: nl.nav.home, icon: Home },
    { href: "/schedule", label: nl.nav.schedule, icon: CalendarDays },
    { href: "/standings", label: nl.nav.standings, icon: Trophy },
    loggedIn ? { href: "/team", label: nl.nav.team, icon: Users } : { href: "/login", label: nl.nav.login, icon: LogIn },
    ...(isAdmin ? [{ href: "/admin", label: nl.nav.admin, icon: Settings }] : []),
  ];
}

const active = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function BottomNav({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Hoofdmenu"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {items(loggedIn, isAdmin).map(({ href, label, icon: Icon }) => {
          const on = active(path, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", on ? "text-brand" : "text-muted")}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition", on && "bg-brand-soft")}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopNav({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Hoofdmenu" className="hidden md:block">
      <ul className="flex gap-1">
        {items(loggedIn, isAdmin).map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active(path, href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition",
                active(path, href) ? "bg-brand-soft text-brand" : "text-muted hover:text-fg",
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
