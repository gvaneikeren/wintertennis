"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Lightbulb, X } from "lucide-react";
import { getFlag, setFlag } from "@/lib/local-flag";

/** A dismissible hint shown where the action happens. Renders after mount to avoid a hydration flash. */
export function Tip({ id, title, children, help }: { id: string; title: string; children: ReactNode; help?: string }) {
  const key = `wt:tip:${id}`;
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!getFlag(key)), [key]);
  if (!show) return null;
  return (
    <aside data-tip={id} className="relative rounded-2xl border border-brand/25 bg-brand-soft/60 p-4 pr-12 text-sm">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <div className="text-fg/80">{children}</div>
          {help && (
            <Link href={`/help#${help}`} className="inline-flex min-h-11 items-center font-semibold text-brand">
              Lees de uitleg →
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Tip sluiten"
        className="absolute top-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
        onClick={() => {
          setFlag(key);
          setShow(false);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
