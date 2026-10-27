# Campus · Student Organization Event Portal

React 19 + TypeScript + Vite website backed by Supabase Auth and PostgreSQL. The existing design is retained. The discontinued application is excluded from this work.

## Setup

Use Node 22.12+ (22.x), 24.x, or 26+ and npm. Run application commands inside `website/`:

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` using the project Connect dialog. A legacy anon key is also accepted. Never use a secret/service-role key in a Vite variable. Restart Vite after changing environment variables. Missing configuration displays a setup message; there is no silent local-storage fallback.

For a new Supabase project, create one at https://supabase.com/dashboard, select its region and save its database password securely. Configure Auth Site URL and allowed redirects for `http://127.0.0.1:5173` and your deployed origin. Email confirmation follows the project's Auth settings; signup displays a confirmation message when required. Configure SMTP before relying on production email delivery. Local Supabase configuration uses port 5173 and disables confirmation for local development only.

## Database setup

Run Supabase commands from the workspace root (the directory containing `supabase/`). CLI version verified: 2.122.0. CLI login and Codex MCP login are separate credentials.

```powershell
npx.cmd --yes supabase@2.122.0 login
npx.cmd --yes supabase@2.122.0 link --project-ref YOUR_PROJECT_REF
npx.cmd --yes supabase@2.122.0 db push --dry-run
npx.cmd --yes supabase@2.122.0 db push
```

Inspect existing tables and migration history first. The initial migration creates the portal's tables and intentionally fails rather than replacing identically named existing tables. All schema changes belong in versioned `supabase/migrations/`; do not change the schema manually in the dashboard. `campus_private` must stay outside the Data API's exposed schemas. Only `public` is needed by the website.

The Auth signup trigger creates student profiles and ignores role/organization claims in editable user metadata. For pre-existing Auth accounts, an authorized database administrator must provision profiles deliberately. Organizer/admin roles are assigned only by an existing administrator or trusted database workflow. Users cannot promote themselves or select an organization at signup.

### Development seed

Only seed a disposable development project. `supabase/seed.sql` contains **test-only** identities and a clearly marked shared test password. Never use that password for real users. It retains existing matching fixtures rather than deleting records; it refuses identity collisions. Dates are relative to first execution, so use a fresh disposable database when those fixtures become historical. Rerunning the seed restores its named fixture statuses/roles; do not run it during an evidence-collection campaign.

```powershell
npx.cmd --yes supabase@2.122.0 db query --linked --file supabase/seed.sql
```

For a fresh local Supabase stack with Docker, `supabase start` followed by `supabase db reset` applies migrations and seed; reset destroys that local database. Never reset a shared database for routine testing.

| Test email | Role |
| --- | --- |
| student01@campus.test through student15@campus.test | Student |
| cict.organizer@campus.test | Organizer, CICT |
| arts.organizer@campus.test | Organizer, Creative Arts Society |
| cict.admin@campus.test | Admin (global permissions), CICT affiliation |
| arts.admin@campus.test | Admin (global permissions), Arts affiliation |

Fixtures: 2 organizations, 10 events including draft/open/closed/completed/cancelled states, a full two-seat event, 10 registrations including a cancelled registration, one attendance row, and one ticket per registration. No real personal details are used. The sample `.test` emails do not deliver mail; seed accounts are pre-confirmed.

## Behavior and security

Browsing requires login, matching the existing UI. Students discover/search/filter/page through events, register once, view QR tickets and cancel an unscanned registration. Cancellation retains the ticket, releases capacity and makes the ticket inactive. Re-registering the same student/event is intentionally disallowed. Organizers manage their own organization's events and attendance. Admins use the same screens across organizations; there is no separate admin dashboard.

Only draft event details are editable by organizers. Opening/cancellation follow the original lifecycle; cancellation retains registrations/attendance. Registration rejects full, draft, closed, cancelled, completed, past or deadline-expired events. PostgreSQL serializes registration changes on the event row and counts all accepted registrations, regardless of the caller's row visibility. Uniqueness constraints prevent duplicate registrations, tickets and attendance. Standard READ COMMITTED database transactions are assumed; do not change transaction isolation without rechecking concurrency behavior.

QR JSON retains `version`, `eventId`, `registrationId` and `ticketId`. Real QR images are rendered; scanning remains a simulation. The server validates ticket identity, selected event, organization ownership and cancellation before recording check-in once. QR signing/expiry, camera scanning and attendance windows remain unspecified. Schedules display in Asia/Manila, including editing UTC timestamps as Philippine local time.

Browser-local demo accounts and records are no longer used or imported. Existing localStorage data is preserved. The old global reset control is now test-data information; it cannot erase a shared database. Reports use database records and exclude cancelled registrations. Data refreshes after actions and when the browser regains focus; there is no Realtime subscription or offline synchronization.

| Table | Student | Organizer | Admin |
| --- | --- | --- | --- |
| organizations | Read | Read | Manage |
| profiles | Read/update own nonprivileged fields | Own profile; read registrants for owned events | Manage, subject to Auth identity constraints |
| events | Read non-drafts | Read non-drafts; create/update owned events and read own drafts | Manage all organizations |
| registrations | Create/read/cancel own | Read for owned events | Manage, subject to invariants |
| tickets | Read own | Read for owned events | Manage |
| attendance | Read own | Read owned events; create via validated scan RPC | Manage |
| all tables, signed out | No access | No access | No access |

RLS is enabled on every table. Private security-definer functions have fixed empty search paths, explicit identity/ownership checks, and restricted execution grants. Public RPC wrappers are security invokers. Profile guards prevent changing roles, organization, email or identity through self-service; email is synchronized from Auth. Passwords are handled by Supabase Auth, never by the profile table. Foreign keys retain event history; destructive admin operations can be refused when dependent records exist.

## Checks and types

Inside `website/`:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run db:types
```

Database tests apply the real migration to PGlite PostgreSQL with actual RLS/API roles and a minimal Supabase Auth SQL boundary. Seed tests execute the real seed (including bcrypt via pgcrypto) twice. These do not run GoTrue, PostgREST, independent database connections or hosted Auth email delivery. Hosted and independent-client checks are described in `MTP_TESTING_GUIDE.md` and remain separate evidence.

`src/database.types.ts` is generated from the migration-applied local catalog by `npm run db:types`. Once connected, generate directly from the actual project using the official CLI from the workspace root:

```powershell
npx.cmd --yes supabase@2.122.0 gen types --project-id YOUR_PROJECT_REF --schema public --lang typescript
```

Save successful output to `website/src/database.types.ts` (check command success before replacing the file). Rebuild after regenerating. No SSR helper is needed for this Vite SPA. Deployments must serve SPA fallback to `index.html` and supply the Vite variables at build time.

Implementation status, changed-file inventory and remaining verification are in `SUPABASE_IMPLEMENTATION.md`. Official setup reference: https://supabase.com/docs/guides/auth/quickstarts/react
