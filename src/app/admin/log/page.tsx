import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/server/db";
import { formatDateTime } from "@/lib/nl";

export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  });
  return (
    <div>
      <PageHeader title="Activiteitenlog" subtitle="Laatste 200 acties" />
      <Card className="divide-y divide-border text-sm">
        {entries.map((e) => (
          <div key={e.id} className="px-4 py-3">
            <div className="flex justify-between gap-3">
              <span className="font-mono text-xs font-semibold">{e.action}</span>
              <span className="text-xs text-muted tabular-nums">{formatDateTime(e.createdAt)}</span>
            </div>
            <div className="text-xs text-muted">
              {e.user?.name ?? e.user?.email ?? "—"}
              {e.ip ? ` · ${e.ip}` : ""}
              {e.entity ? ` · ${e.entity}` : ""}
            </div>
            {e.details != null && (
              <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-2 p-2 text-[11px]">{JSON.stringify(e.details)}</pre>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
