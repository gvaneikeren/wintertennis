import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { AdminTabs } from "./tabs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) redirect("/");
  return (
    <div>
      <AdminTabs />
      {children}
    </div>
  );
}
