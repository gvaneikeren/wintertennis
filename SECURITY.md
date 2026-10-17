# Security – OWASP Top 10 (2021) checklist

Status per risk. Each entry links to where the control is implemented, and the "Verified" column says how it was checked.

| # | Risk | Controls | Where | Verified |
|---|---|---|---|---|
| A01 | Broken Access Control | Every server action calls a guard. The team/side is taken from the DB fixture, never from the client. Only the opposing team can approve, and an approved score is locked except for admin reopen. Admin pages are guarded server-side in the layout. | `src/lib/server/auth-guards.ts`, `src/app/actions/*`, `src/lib/match-status.ts`, `src/app/admin/layout.tsx` | Unit tests (`lineup.test.ts` state machine); e2e: own team / unrelated captain cannot approve, anonymous → login redirect |
| A02 | Cryptographic Failures | bcrypt (cost 12) for passwords. Invite and reset tokens are 32 random bytes, and only their SHA-256 hash is stored. HTTPS is enforced with HSTS. Secrets live only in env vars, and `.env*` is gitignored. | `passwords.ts`, `tokens.ts`, `next.config.ts` | Code review |
| A03 | Injection | Prisma queries are parameterized; the one raw query uses a tagged template. All input is validated with Zod. React escapes output, and `dangerouslySetInnerHTML` is never used. Email HTML is escaped. | `rate-limit.ts`, `actions/*`, `mail.ts` | `grep -r "queryRawUnsafe\|dangerouslySetInnerHTML" src` → none |
| A04 | Insecure Design | Sign-up is invite-only. Invites are single-use, enforced with a conditional update. The score state machine runs server-side. Rate limits apply to login (5/15 min per IP+email), registration (10/h per IP), invites (30/h per user) and password reset (5/h per IP). | `invites.ts`, `match-status.ts`, `auth.ts` | e2e: an invite link can't be used twice |
| A05 | Security Misconfiguration | CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP; the `X-Powered-By` header is turned off. Unexpected errors show a generic message. Redirects only go to relative paths (`safeRedirect`). | `next.config.ts`, `auth-guards.ts#run`, `actions/auth.ts` | `curl -I` on the deployment and securityheaders.com |
| A06 | Vulnerable & Outdated Components | Lockfile committed; `npm ci` in CI; `npm audit`; Dependabot. | `package-lock.json`, `.github/dependabot.yml` | `npm audit --omit=dev` |
| A07 | Identification & Authentication Failures | Passwords need at least 10 characters and are checked against a list of common passwords. The login error is the same whether or not the account exists, and response timing is equalized with a dummy bcrypt hash. JWT sessions last 30 days. Reset tokens expire after 1 hour and work once. Email + password is the only login method. | `passwords.ts`, `auth.ts`, `actions/auth.ts` | e2e: generic error, short password rejected server-side |
| A08 | Software & Data Integrity Failures | Only official npm packages, with the lockfile integrity checked by `npm ci`. Score changes are logged with old and new values. | `actions/score.ts` → `AuditLog` | `/admin/log` |
| A09 | Logging & Monitoring Failures | The audit log covers logins (success, failure, rate-limited, no access), registration, invites, score submit/approve/dispute/reopen, line-ups and admin changes. The admin can view it at `/admin/log`, and Vercel runtime logs are also available. | `audit.ts` | Manual |
| A10 | SSRF | The app never fetches URLs supplied by users. Outbound traffic goes only to the configured SMTP host. | — | Code review |

## Known trade-offs

- **CSP:** `script-src` allows `'unsafe-inline'` because Next.js injects inline bootstrap scripts. Nonces would make every page dynamic. XSS risk stays low because React escapes all output and there is no `dangerouslySetInnerHTML`.
- **Rate limiting:** stored in Postgres, which is good enough for this traffic level. If abuse shows up, switch to Upstash Redis.
- **Client IP:** taken from `x-forwarded-for`, which Vercel sets reliably. When self-hosting behind another proxy, check this still holds.

## Known `npm audit` findings (2026-10-16)

| Package | Why it does not affect this app | Fix path |
|---|---|---|
| nodemailer (via next-auth/@auth/core too) | The advisories need user-controlled `raw`, attachment or `resolveContent` input. We only send fixed text with an escaped link. | Upgrade when a patched release is out |
| postcss (via next) | Only processes our own CSS at build time | Next.js 16 upgrade |
| deepmerge-ts (via prisma CLI config) | Only runs in the Prisma CLI, never in the deployed app | Prisma 7 upgrade |

The CI audit step reports these findings but does not fail the build. Review this table on every Dependabot PR.

## Periodic checks

1. Run `npm audit --omit=dev`.
2. Run an OWASP ZAP baseline scan against a preview deployment:
   `docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://<preview>.vercel.app`
3. Run a manual IDOR check: as a member of team A, call actions with IDs from team B's matches. Every call must return "Geen toegang".
4. Run `/security-review` in Claude Code before larger changes.

## Reporting

Email security issues to the maintainer (gvaneikeren@hotmail.com) instead of opening a public issue.

## Privacy

Anonymous visitors see team names, the schedule, scores and standings only. Player names, user names, email addresses and dispute comments are removed server-side for visitors who aren't logged in (`src/app/fixtures/[id]/page.tsx`). The invite page doesn't show who sent the invite and doesn't prefill the invitee's email. The e2e test "anonymous visitors see no personal data" checks the raw server responses.
