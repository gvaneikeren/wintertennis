import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function audit(entry: {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({ data: { ...entry, userId: entry.userId ?? null } });
  } catch (e) {
    // Never let logging break the user's action.
    console.error("audit log failed", e);
  }
}
