import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nieuw wachtwoord" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-sm pt-4">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Nieuw wachtwoord</h1>
      <Card className="p-5">
        <ResetForm token={token} />
      </Card>
    </div>
  );
}
