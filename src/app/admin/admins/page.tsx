import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth-guards";
import { AddAdminForm, RemoveAdminButton } from "./admin-admins";

export const metadata: Metadata = { title: "Beheerders" };

export default async function AdminsPage() {
  const me = await requireAdmin();
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Beheerders" subtitle="Beheerders kunnen teams, het programma en geschillen beheren." />
      <Card className="divide-y divide-border">
        {admins.map((a) => (
          <div key={a.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {a.name ?? a.email}
                {a.id === me.id && (
                  <Badge tone="brand" className="ml-2">
                    jij
                  </Badge>
                )}
              </div>
              <div className="truncate text-xs text-muted">{a.email}</div>
            </div>
            <div className="flex items-center gap-2">
              {!a.passwordHash && <Badge tone="warn">Nog geen wachtwoord</Badge>}
              {a.id !== me.id && admins.length > 1 && <RemoveAdminButton userId={a.id} name={a.name ?? a.email} />}
            </div>
          </div>
        ))}
      </Card>
      <AddAdminForm />
    </div>
  );
}
