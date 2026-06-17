# ACDM Setup Guide

## 1. PostgreSQL Database

Create the `acdm` database on PostgreSQL 18:

```sql
CREATE DATABASE acdm;
```

Update `.env` with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/acdm?schema=public"
AUTH_SECRET="your-random-secret-at-least-32-characters-long"
```

## 2. Install & Migrate

```bash
npm install
npx prisma generate
npm run db:migrate:deploy   # or: npx prisma migrate deploy
```

## 3. Seed Data

```bash
npm run seed
```

This imports:
- `projects.json` — 20 applications with domains and ports
- `D:\under-construction\ports.json` — under-construction port entries
- `D:\nginx\conf\sites\*.conf` — nginx site configurations
- Master records (idea sources, technologies, deployment types)
- Default settings (all paths configurable)
- Default users, sample clients, and server registry entry
- Storage directories under `D:\server-config`

## 4. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Default Credentials

Set in `.env` before running `npm run seed`:

```env
SEED_USER_SUPER_ADMIN_USERNAME=acdmsuperadmin
SEED_USER_SUPER_ADMIN_PASSWORD=your-password
SEED_USER_ADMINISTRATOR_USERNAME=acdmadministrator
SEED_USER_ADMINISTRATOR_PASSWORD=your-password
SEED_USER_VIEWER_USERNAME=acdmviewer
SEED_USER_VIEWER_PASSWORD=your-password
```

| Variable prefix | Role |
|-----------------|------|
| `SEED_USER_SUPER_ADMIN_*` | SUPER_ADMIN |
| `SEED_USER_ADMINISTRATOR_*` | ADMINISTRATOR |
| `SEED_USER_VIEWER_*` | VIEWER |

Re-running seed updates password hashes from `.env`. Change these values in production.

## 5. Verify

- Health check: `GET http://localhost:3000/api/health`
- Login: `http://localhost:3000/login`
- Dashboard: `http://localhost:3000/dashboard` (reporting KPIs + recent audit)
- Audit Logs: `http://localhost:3000/audit-logs`
- Settings: `http://localhost:3000/settings` (Super Admin only)
- Users: `http://localhost:3000/users` (Super Admin only)

See also:
- [Application Guide](APPLICATION-GUIDE.md) — register apps per technology
- [Module Operations Guide](MODULE-OPERATIONS.md) — how to use each module

## Troubleshooting

### Prisma generate fails with DATABASE_URL error
Ensure `.env` exists in project root with a valid `DATABASE_URL`.

### PostgreSQL connection refused
Verify the `postgresql-x64-18` Windows service is running.

### Seed warnings for nginx/ports
Ensure `D:\nginx\conf\sites` and `D:\under-construction\ports.json` exist on this server.
