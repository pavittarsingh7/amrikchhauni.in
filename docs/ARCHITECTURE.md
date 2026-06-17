# ACDM Architecture — Phase 1

## Overview

ACDM (Amrik Chhauni Deployment Manager) is a hybrid-storage deployment platform designed for Windows Server environments running Nginx, PM2, IIS, and PostgreSQL.

## Database Schema

### Core Entities

```
User ────────────── AuditLog
  │
  └── Application ──┬── Domain
                    ├── Port
                    ├── Pm2Process
                    ├── IisSite
                    └── MaintenanceConfig

Client ──── Application ──── IdeaSource
                │
                ├── Technology
                └── DeploymentType
```

### Master Tables (no enums — database-driven)

- **IdeaSource** — Pavittar, Amrik, Sanjeev, Personal, Development, Hobby, Client
- **Technology** — Next.js, React, Node.js, Angular, ASP.NET, Python, Static HTML
- **DeploymentType** — PM2, IIS, PYTHON, STATIC, DOCKER, WINDOWS_SERVICE

### Infrastructure Entities

- **NginxConfig** + **NginxConfigBackup** — config files with automatic backup before changes
- **Pm2Process** — discovered PM2 applications
- **IisSite** — discovered IIS sites with binding/app pool info
- **SslCertificate** — Win-ACME managed certificates
- **WindowsService** — whitelisted services for safe management
- **Backup** — database and config backup records
- **MaintenancePage** + **MaintenanceConfig** — per-site or server-wide maintenance
- **DiscoverySuggestion** — pending approval for auto-discovered apps
- **Snapshot** — metadata for JSON snapshot files
- **Server** — multi-server registry (current server seeded first)

## Authentication Flow

```
Login Form → Server Action → bcrypt verify → JWT cookie (httpOnly)
                                              ↓
proxy.ts (Next.js middleware) → jwtVerify → redirect /dashboard or /login
```

Session payload: `{ id, username, role }`

## Configuration Change Flow

```
User Action
    ↓
Server Action (role check)
    ↓
1. Backup current state (if applicable)
    ↓
2. Save to PostgreSQL
    ↓
3. Create JSON snapshot → D:\server-config\snapshots\{entity}\
    ↓
4. Write audit log
    ↓
5. Execute side effect (nginx -t, reload, etc.)
    ↓
6. Rollback on failure
```

## Maintenance Mode Strategy

Original Nginx configs are **never modified**. Instead:

```nginx
# Generated include in site config
include D:/server-config/maintenance/maintenance.conf;
```

- **Enable:** Write maintenance.conf with redirect/503 page
- **Disable:** Remove or empty maintenance.conf
- Application continues running — no PM2/IIS restart needed

## Discovery Services (Phase 2)

| Service | Source | Output |
|---------|--------|--------|
| Nginx Discovery | `D:\nginx\conf\sites\*.conf` | Domain records with SSL, proxy_pass, port |
| PM2 Discovery | `pm2 list` JSON | Pm2Process records |
| IIS Discovery | PowerShell IIS module | IisSite records with bindings |
| App Discovery | Scan project directories | DiscoverySuggestion (pending approval) |

## Port Registry

Centralized port inventory with statuses:
- `AVAILABLE` — free for assignment
- `RESERVED` — allocated but not deployed
- `IN_USE` — actively serving traffic
- `UNDER_CONSTRUCTION` — maintenance/development

Auto-assign: finds next free port in configured range (default 4000–9999).

## File System Layout

```
D:\server-config\
├── backups\
│   ├── database\     ← pg_dump output
│   ├── nginx\        ← config backups before edits
│   ├── ssl\          ← certificate exports
│   └── settings\     ← settings snapshots
├── storage\
│   ├── config\       ← runtime config files
│   ├── exports\      ← data exports
│   └── imports\      ← import staging
├── snapshots\
│   ├── applications\
│   ├── domains\
│   ├── ports\
│   └── settings\
└── maintenance\
    └── maintenance.conf  ← generated include file
```

## Security Considerations

- Passwords hashed with bcrypt (cost factor 12)
- JWT sessions in httpOnly cookies
- Super Admin gate on destructive operations
- Windows service whitelist prevents arbitrary service control
- Server command execution restricted to Super Admin
- All paths configurable — no hardcoded infrastructure assumptions
- Audit log on every mutation

## Implementation Status

All six development phases are complete. See `docs/PHASE-*.md` for per-phase details.

**Future enhancements (not yet built):**
- Deployment workflow / history model
- JSON snapshot browse and restore UI
- Remote multi-server command execution
- Docker container management
