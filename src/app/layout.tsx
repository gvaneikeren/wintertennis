import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Toaster } from "sonner";
import { HelpCircle, LogOut } from "lucide-react";
import "./globals.css";
import { BottomNav, TopNav } from "@/components/nav";
import { WelcomeSheet, type WelcomeRole } from "@/components/onboarding/welcome-sheet";
import { getCurrentUser } from "@/lib/server/auth-guards";
import { logoutAction } from "@/app/actions/auth";
import { nl } from "@/lib/nl";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: nl.appName, template: `%s · ${nl.appName}` },
  description: nl.tagline,
  appleWebApp: { capable: true, title: nl.appName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0c120e" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const loggedIn = Boolean(user);
  const isAdmin = Boolean(user?.isAdmin);
  const welcomeRole: WelcomeRole = !user
    ? "none"
    : user.memberships.some((m) => m.role === "CAPTAIN")
      ? "captain"
      : user.memberships.length > 0
        ? "member"
        : user.isAdmin
          ? "admin"
          : "none";
  return (
    <html lang="nl">
      <body className={`${inter.variable} font-sans antialiased`}>
        <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ball text-lg shadow-inner" aria-hidden>
                🎾
              </span>
              {nl.appName}
            </Link>
            <TopNav loggedIn={loggedIn} isAdmin={isAdmin} />
            <div className="flex items-center gap-1">
              <Link
                href="/help"
                aria-label="Uitleg"
                className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
              >
                <HelpCircle className="h-5 w-5" aria-hidden />
                <span className="hidden sm:inline">Uitleg</span>
              </Link>
              {user && (
                <form action={logoutAction}>
                  <button className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:bg-surface-2" aria-label={nl.actions.logout}>
                    <span className="hidden max-w-32 truncate sm:inline">{user.name ?? user.email}</span>
                    <LogOut className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 md:pb-12">{children}</main>
        <BottomNav loggedIn={loggedIn} isAdmin={isAdmin} />
        {user && <WelcomeSheet userId={user.id} role={welcomeRole} firstName={user.name?.split(" ")[0] ?? null} />}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
