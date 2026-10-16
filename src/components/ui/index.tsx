import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

export function buttonClass(variant: ButtonProps["variant"] = "primary", size: ButtonProps["size"] = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand select-none",
    {
      primary: "bg-brand text-brand-fg shadow-sm hover:brightness-110",
      secondary: "bg-surface-2 text-fg hover:brightness-95",
      outline: "border border-border bg-surface text-fg hover:bg-surface-2",
      ghost: "text-fg hover:bg-surface-2",
      danger: "bg-danger-soft text-danger hover:brightness-95",
    }[variant],
    {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-[15px]",
      lg: "h-13 px-5 text-base w-full",
      icon: "h-11 w-11",
    }[size],
  );
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "brand" | "warn" | "danger" | "info" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        {
          neutral: "bg-surface-2 text-muted",
          brand: "bg-brand-soft text-brand",
          warn: "bg-warn-soft text-warn",
          danger: "bg-danger-soft text-danger",
          info: "bg-info-soft text-info",
        }[tone],
        className,
      )}
      {...props}
    />
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-base text-fg placeholder:text-muted focus:outline-2 focus:outline-brand";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "appearance-none bg-[length:16px] pr-9", className)} {...props} />;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <Card className="p-6 text-center text-sm text-muted">{children}</Card>;
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "info" | "brand" | "warn"; children: React.ReactNode }) {
  const cls = { danger: "bg-danger-soft text-danger", info: "bg-info-soft text-info", brand: "bg-brand-soft text-brand", warn: "bg-warn-soft text-warn" }[tone];
  return (
    <div role="alert" className={cn("rounded-xl px-3.5 py-3 text-sm font-medium", cls)}>
      {children}
    </div>
  );
}
