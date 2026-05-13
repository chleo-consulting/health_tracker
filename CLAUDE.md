# CLAUDE.md

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture. Whenever you detect inconsistencies, please expose them before going on, and ask the user for recommendation to update the spec or update the prompt.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev              # Start development server (http://localhost:3000)
bun run build        # Build for production
bun run lint         # Run ESLint
bun start            # Start production server
bun test             # Run tests (Bun test + React Testing Library)
bunx drizzle-kit generate  # Generate Drizzle migrations (PostgreSQL)
bunx drizzle-kit migrate   # Apply pending migrations (nécessite DATABASE_DIRECT_URL ou DATABASE_URL)
bunx drizzle-kit studio    # Visual DB explorer
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase connection string **pooled** (port 6543, Transaction mode) — app runtime |
| `DATABASE_DIRECT_URL` | Supabase connection string **directe** (port 5432) — drizzle-kit migrations uniquement |
| `BETTER_AUTH_SECRET` | JWT signing secret for Better-auth (min 32 chars) |
| `BETTER_AUTH_URL` | Public app URL (e.g. `https://monapp.vercel.app`) |

## Architecture

This is a Next.js 16.1 application using the App Router pattern with:

- **Runtime**: Bun (dev & production)
- **Package Manager**: Bun (bun.lock present)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS 4 with PostCSS
- **React**: Version 19
- **Database**: PostgreSQL via Supabase + `postgres-js` + Drizzle ORM (`pg-core`)
- **Auth**: Better-auth (Credentials Provider, JWT sessions in HttpOnly cookie, provider `"pg"`)
- **Deployment**: Vercel (`vercel.json`, buildCommand `bun run build`)

### Key Dependencies

- `better-auth` — Authentication (Credentials Provider, session JWT)
- `drizzle-orm` / `drizzle-kit` — ORM and migrations for PostgreSQL (`pg-core`)
- `postgres` — postgres-js driver (`prepare: false` for Supabase PgBouncer)
- `recharts` — Chart library (LineChart for weight evolution)
- `zod` — Schema validation
- `react-hook-form` — Form handling with Zod integration

### Database

- Provider: Supabase PostgreSQL (project `remwjeqmsdxzalcwsqsj`)
- Connection: `DATABASE_URL` pooled port 6543 (app) / `DATABASE_DIRECT_URL` direct port 5432 (migrations)
- Tables managed by Better-auth: `user`, `session`, `account`, `verification`
- App table: `weight_entries` (id serial PK, user_id FK→user.id, entry_date text, weight_kg double precision, notes, created_at timestamp)
- Unique constraint: `(user_id, entry_date)` — one entry per user per day

### Project Structure

```
src/
├── app/
│   ├── (auth)/login/ & register/   # Auth pages
│   ├── dashboard/                   # Main app page (stats, chart, table)
│   ├── api/
│   │   ├── auth/[...all]/           # Better-auth catch-all handler
│   │   ├── auth/register/           # Custom registration with Zod validation
│   │   ├── entries/                  # GET (list) + POST (upsert)
│   │   ├── entries/stats/            # GET (aggregated statistics)
│   │   ├── entries/export/           # GET (CSV export)
│   │   ├── entries/import/           # POST (CSV import)
│   │   ├── entries/[id]/             # GET + DELETE single entry
│   │   └── health/                   # GET (healthcheck)
│   ├── layout.tsx
│   └── page.tsx                      # Landing page
├── components/
│   ├── auth/          # LoginForm, RegisterForm
│   ├── dashboard/     # StatsCards, WeightChart, WeightTable, DateRangeFilter
│   ├── entries/       # EntryForm, DeleteConfirmDialog
│   └── ui/            # Button, Input, Modal
├── lib/
│   ├── db/index.ts    # postgres-js + Drizzle instance (prepare: false)
│   ├── db/schema.ts   # Drizzle schema pg-core (Better-auth tables + weight_entries)
│   ├── auth.ts        # Better-auth config
│   └── validations/   # Zod schemas (auth, entries)
└── types/             # Shared TypeScript types
middleware.ts          # Route protection (JWT validation)
vercel.json            # Vercel deployment config
```

- `@/*` path alias maps to project root

### Design System

Custom color palette defined in `src/app/globals.css` via Tailwind CSS 4 `@theme` directive.
To change the palette, only edit `globals.css` — all components reference token names, not hex values.
