"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin", label: "Overzicht" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/schedule", label: "Programma" },
  { href: "/admin/admins", label: "Beheerders" },
  { href: "/admin/log", label: "Log" },
];

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Beheer" className="-mx-4 mb-5 overflow-x-auto px-4">
      <ul className="flex w-max gap-1 rounded-xl bg-surface-2 p-1">
        {TABS.map((t) => {
          const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn("block rounded-lg px-4 py-2 text-sm font-semibold", on ? "bg-surface shadow-sm" : "text-muted")}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
