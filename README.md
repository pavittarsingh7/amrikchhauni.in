# ACDM — Amrik Chhauni Deployment Manager

Internal deployment management platform for managing applications, domains, Nginx configurations, PM2 processes, IIS websites, SSL certificates, ports, maintenance pages, backups, and server settings.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, HeroUI, TailwindCSS 4 |
| Database | PostgreSQL 18 via Prisma 7 |
| Auth | Local (JWT session cookies + bcrypt) |
| Validation | Zod + React Hook Form |
| Tables | TanStack Table |
| Storage | Hybrid — PostgreSQL + JSON snapshots |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    ACDM (Next.js)                    │
├──────────────┬──────────────┬───────────────────────┤
│  App Router  │ Server Actions│  Middleware (Auth)    │
├──────────────┴──────────────┴───────────────────────┤
│                    Service Layer                     │
│  auth │ settings │ audit │ storage │ discovery       │
├──────────────────────┬──────────────────────────────┤
│   PostgreSQL 18      │   D:\server-config (JSON)    │
│   Database: acdm     │   snapshots, backups, exports  │
└──────────────────────┴──────────────────────────────┘
```

### Dual Storage Pattern

Every configuration change follows this flow:

1. **Save to PostgreSQL** — primary source of truth
2. **Create JSON Snapshot** — written to `D:\server-config\snapshots\{entity}\`
3. **Write Audit Log** — user, action, module, before/after, IP

### Role-Based Access

| Role | Capabilities |
|------|-------------|
| `SUPER_ADMIN` | Full access including Nginx restart/reload, SSL, Settings, Server Commands, Users |
| `ADMINISTRATOR` | Read/write on most modules, no super-admin actions |
| `VIEWER` | Read-only access |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 18 (database: `acdm`)
- Windows Server with Nginx, PM2, IIS installed

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit DATABASE_URL and AUTH_SECRET

# Create database (if not exists)
# psql -U postgres -c "CREATE DATABASE acdm;"

# Run migrations
npm run db:migrate

# Seed data (projects, nginx, ports, master records)
npm run seed

# Start development server
npm run dev
```

Default credentials are defined in `.env` (re-run `npm run seed` after changing them):

| Env variable | Role |
|--------------|------|
| `SEED_USER_SUPER_ADMIN_USERNAME` / `SEED_USER_SUPER_ADMIN_PASSWORD` | Super Admin |
| `SEED_USER_ADMINISTRATOR_USERNAME` / `SEED_USER_ADMINISTRATOR_PASSWORD` | Administrator |
| `SEED_USER_VIEWER_USERNAME` / `SEED_USER_VIEWER_PASSWORD` | Viewer |

Copy `.env.example` to `.env` and set values before seeding. Change passwords in production.

### Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── actions/          # Server Actions (auth, settings, ...)
├── app/
│   ├── (app)/        # Authenticated routes with sidebar
│   ├── login/        # Public login page
│   └── layout.tsx    # Root layout with HeroUI provider
├── components/
│   ├── auth/         # Login form
│   ├── layout/       # Sidebar, AppShell
│   └── ui/           # Shared UI components
├── lib/
│   ├── audit/        # Audit log writer
│   ├── auth/         # Session, roles, password hashing
│   ├── db/           # Prisma client singleton
│   ├── settings/     # Settings service (all paths configurable)
│   └── storage/      # JSON snapshot utilities
└── proxy.ts           # Route protection (Next.js middleware)

prisma/
├── schema.prisma     # Full database schema
├── seed.ts           # Seed script
└── migrations/       # Database migrations

D:\server-config/     # Secondary storage (created by seed)
├── backups/
├── storage/
├── snapshots/
└── maintenance/
```

## Development Phases

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Architecture, Prisma, Auth, Settings | ✅ Complete |
| **Phase 2** | Discovery Services (Nginx, PM2, IIS, Apps) | ✅ Complete |
| **Phase 3** | Applications, Domains, Ports CRUD | ✅ Complete |
| **Phase 4** | Nginx, PM2, IIS Management | ✅ Complete |
| **Phase 5** | SSL, Backups, Maintenance | ✅ Complete |
| **Phase 6** | Dashboard, Reporting, Audit Logs, Admin CRUD | ✅ Complete |

## Documentation

| Guide | Description |
|-------|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Installation, migrate, seed, credentials |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, storage, auth flow |
| [docs/APPLICATION-GUIDE.md](docs/APPLICATION-GUIDE.md) | **Add / edit / delete apps by tech stack** (Next.js, React, Angular, ASP.NET, Python, Static, Docker, Windows Service) |
| [docs/MODULE-OPERATIONS.md](docs/MODULE-OPERATIONS.md) | **Operations for every ACDM module** (step-by-step) |
| [docs/PHASE-2.md](docs/PHASE-2.md) – [PHASE-6.md](docs/PHASE-6.md) | Per-phase implementation notes |

## Settings

All infrastructure paths are stored in the database `settings` table — nothing is hardcoded. Defaults are seeded on first run and editable via the Settings module (Super Admin only).

Key settings:
- `paths.nginx_sites` — Nginx site config directory
- `paths.pm2_root` — PM2 root directory
- `paths.win_acme` — Win-ACME executable path
- `paths.projects` — Project scan directories
- `service.nginx_name` — Windows service name for Nginx

## Seed Data Sources

The seed script imports from:
- `projects.json` — application metadata
- `D:\under-construction\ports.json` — under-construction ports
- `D:\nginx\conf\sites\*.conf` — nginx site configurations

## License

Internal use only — Amrik Chhauni infrastructure.
