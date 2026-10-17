"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight, HelpCircle, X } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getFlag, setFlag } from "@/lib/local-flag";
import { progress, type OnboardingStep } from "@/lib/onboarding";

/** Self-ticking "Aan de slag" list. Steps come from real data; it hides once every required step is done. */
export function Checklist({ steps, storageKey, title = "Aan de slag" }: { steps: OnboardingStep[]; storageKey: string; title?: string }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => setHidden(getFlag(storageKey)), [storageKey]);
  const p = progress(steps);
  if (hidden || p.complete || steps.length === 0) return null;

  return (
    <Card data-checklist className="overflow-hidden" aria-labelledby="checklist-title">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 id="checklist-title" className="text-lg font-bold">
            {title}
          </h2>
          <p className="text-sm text-muted">
            {p.done} van {p.total} klaar
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${(p.done / p.total) * 100}%` }} />
          </div>
        </div>
        <button
          type="button"
          aria-label="Checklist verbergen"
          className="-mt-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          onClick={() => {
            setFlag(storageKey);
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="divide-y divide-border border-t border-border">
        {steps.map((s) => (
          <li key={s.id} data-step={s.id} data-done={s.done} className="flex items-stretch">
            <Link href={s.href} className="flex min-h-16 flex-1 items-center gap-3 px-4 py-2 hover:bg-surface-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                  s.done ? "border-brand bg-brand text-brand-fg" : "border-border",
                )}
                aria-hidden
              >
                {s.done && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-medium", s.done && "text-muted line-through")}>
                  {s.label}
                  {s.optional && <span className="ml-1 text-xs font-normal text-muted">(optioneel)</span>}
                </span>
                {s.detail && !s.done && <span className="block text-xs text-muted">{s.detail}</span>}
                <span className="sr-only">{s.done ? "Klaar" : "Nog te doen"}</span>
              </span>
              {!s.done && <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />}
            </Link>
            <Link
              href={`/help#${s.helpId}`}
              aria-label={`Uitleg: ${s.label}`}
              className="flex w-12 shrink-0 items-center justify-center border-l border-border text-muted hover:bg-surface-2 hover:text-brand"
            >
              <HelpCircle className="h-5 w-5" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
