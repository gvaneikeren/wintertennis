# WinterTennis

Mobile-first website for a Saturday-night indoor tennis competition: schedule, standings, line-ups, and score entry with approval by the opposing team. The UI is in Dutch.

## Local development

```bash
cp .env.example .env.local && cp .env.example .env   # then fill in AUTH_SECRET
npm install
npm run db:up && npx prisma migrate dev && npm run db:seed
npm run dev
```

Seeded logins: `admin@example.com` and `captain1@example.com` … `captain6@example.com`. The password for all of them is `wintertennis-dev`.

## Deployment (Vercel + Neon)

1. In Vercel, import this GitHub repo.
2. Under **Storage**, add **Neon Postgres**. This sets `DATABASE_URL`.
3. Add the environment variables `AUTH_SECRET`, `APP_URL`, and optionally `SMTP_*` for email (see `.env.example`).
4. Set **Build Command** to `npm run vercel-build`. It runs the database migrations before the build.
5. After the first deploy, create the admin. Pull the production database URL first, because the script needs it:
   `npx vercel env pull .env.production.local && DATABASE_URL=... npm run create-admin -- you@example.com`

See `CLAUDE.md` for architecture and `SECURITY.md` for the OWASP checklist.
