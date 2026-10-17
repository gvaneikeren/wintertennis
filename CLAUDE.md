# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A mobile-first website for a Saturday-night indoor tennis competition (Next.js 15 App Router, Prisma + PostgreSQL, Auth.js v5, Tailwind v4). The UI is in Dutch; code and identifiers stay in English. Hosted on Vercel with Neon Postgres. Git remote: `github.com/gvaneikeren/wintertennis` (a push to `main` deploys).

## Commands

Node 22 is installed via nvm. In a non-interactive shell, run `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` first.

```bash
npm run db:up                 # local Postgres in Docker on port 5433
npx prisma migrate dev        # apply/create migrations (Prisma CLI reads .env; Next reads .env.local)
npm run db:seed               # reset dev data: 6 teams, admin@example.com, captain1..6@example.com, password "wintertennis-dev"
npm run dev
npm run typecheck && npm run lint
npm test                                              # Vitest unit tests (src/**/*.test.ts)
npx vitest run src/lib/scoring.test.ts -t "setPoints" # single test
npm run test:e2e                                      # Playwright; seeds the DB first and starts `npm run dev`
E2E_BASE_URL=http://localhost:3001 npx playwright test -g "dispute" --project=mobile-chrome  # against a running server
npm run create-admin -- <email> [name]                # makes a user admin and prints a set-password link
```

The e2e flows are stateful and run serially on the `mobile-chrome` project only. Other device projects run just the tests tagged `@public`.

## Domain rules (source of truth: `src/lib/scoring.ts`, `src/lib/schedule.ts`)

- A Saturday has slots `EARLY` (19:00 + 21:00) and `LATE` (20:00 + 22:00). Each slot holds `courts/4` fixtures (team vs team).
- A fixture always has 8 matches (`FIXTURE_TEMPLATE`): 4 mixed doubles in block 1, then 2 ladies' doubles and 2 men's doubles in block 2 after the break.
- A set goes to 5 games, but it can end early when time runs out. Per set, the team with more games gets 1 point; equal games or an unplayed set gives 0.5 to each team. A match is always worth 3 points.
- Valid games per side are 0–5, and 5-5 is invalid.
- Only `APPROVED` matches count toward the standings.

## Architecture

- **Pure logic in `src/lib/*.ts`:** scoring, schedule, line-up gender rules and the score state machine (`match-status.ts`). Everything here is unit tested and has no database access.
- **`src/lib/server/`:** server-only code: the Prisma client, auth guards, queries, invites, rate limiting, the audit log and mail.
- **Mutations are server actions in `src/app/actions/*.ts`:**
  - Every action wraps its body in `run()`, which returns `{ ok, data } | { ok: false, error }`. Throw `UserError` or `AuthError` for messages that are safe to show the user.
  - Every action calls a guard from `auth-guards.ts` (`requireAdmin`, `requireCaptain`, `requireTeamMember`, `requireMatchParticipant`).
  - A team's side is always derived from the fixture in the database, never from client input.
  - Writes call `audit()`.
- **Score workflow:**
  - `OPEN → SUBMITTED → APPROVED | DISPUTED`.
  - The approver must belong to the other team. `APPROVED` is locked, and only an admin can reopen it.
  - When an admin who is outside both teams submits a score, it is approved immediately.
- **Auth:**
  - Sign-in is email + password only (Auth.js credentials provider, bcrypt), with JWT sessions and no database adapter.
  - The current user is always reloaded from the DB in `getCurrentUser()`.
  - Sign-up only happens through invites. The invite token is hashed (SHA-256), single-use and valid for 7 days.
- **Administrators:** `User.isAdmin`. Existing admins add more admins at `/admin/admins` (an existing account is promoted directly; a new email gets an account plus a 7-day set-password link). The last admin cannot be removed. Bootstrap the first admin with `npm run create-admin`.
- **User guidance:**
  - The manual content lives in `src/lib/help.ts` and renders at `/help`, with guides linked as `/help#<id>`. When you change a feature, update its guide there.
  - Checklist rules are in `src/lib/onboarding.ts`, which is pure and unit tested; `getTeamOnboarding` and `getAdminOnboarding` supply the counts.
  - The welcome sheet (`src/components/onboarding/welcome-sheet.tsx`), the checklist and the `Tip` component keep their "seen/dismissed" state in localStorage under `wt:` keys.
  - In e2e tests, `login()` skips the welcome sheet unless `{ welcome: true }` is passed.
- **Invites:** the admin invites captains; captains invite members. They go out by email (SMTP) or a WhatsApp `wa.me` link (no API involved), or as a copyable link.

## Conventions

- Shared Dutch strings and date formatting live in `src/lib/nl.ts`. Dates are stored as UTC dates (`@db.Date`).
- Validate all input with Zod (v4: `z.email()`). Never use `$queryRawUnsafe`.
- **UI rules:**
  - Use the shared components in `src/components/ui`, `Sheet` (a bottom sheet on mobile) and the color tokens in `globals.css` (`bg-surface`, `text-muted`, `bg-brand` and so on).
  - Touch targets are at least 44px.
  - Forms using `useActionState` need controlled inputs; otherwise React 19 resets them after an error.
- **Security headers:** CSP and other security headers are set in `next.config.ts`. See `SECURITY.md` before changing auth, actions or headers.
- **Schema changes:** run `npx prisma migrate dev --name <change>`. Vercel runs `npm run vercel-build`, which includes `prisma migrate deploy`.
