# Module Operations Guide

Complete reference for every ACDM module: purpose, access levels, and step-by-step operations.

**Base URL:** `http://localhost:3000` (or your deployed host)

**Roles:**

| Role | Access |
|------|--------|
| **Viewer** | Read-only on most modules |
| **Administrator** | Read/write on most modules; no destructive infra commands |
| **Super Admin** | Full access including nginx reload, SSL, settings, users |

---

## Table of Contents

1. [Dashboard](#1-dashboard)
2. [Discovery](#2-discovery)
3. [Applications](#3-applications)
4. [Domains](#4-domains)
5. [Ports](#5-ports)
6. [Clients](#6-clients)
7. [Idea Sources](#7-idea-sources)
8. [Technologies](#8-technologies)
9. [Deployments](#9-deployments)
10. [Nginx](#10-nginx)
11. [PM2](#11-pm2)
12. [IIS](#12-iis)
13. [SSL Certificates](#13-ssl-certificates)
14. [Maintenance](#14-maintenance)
15. [Windows Services](#15-windows-services)
16. [Backups](#16-backups)
17. [Audit Logs](#17-audit-logs)
18. [Settings](#18-settings)
19. [Users](#19-users)
20. [Servers](#20-servers)

---

## 1. Dashboard

**URL:** `/dashboard`  
**Purpose:** Infrastructure overview, KPIs, recent activity, alerts.

### Operations

| Action | Steps |
|--------|-------|
| View stats | Open dashboard — see application, domain, port, PM2, SSL, backup counts |
| Review recent activity | Scroll **Recent Activity** — last 8 audit events |
| Check alerts | **Quick Links** — pending discovery, expired SSL, maintenance, failed backups |
| Jump to issue | Click alert links (e.g. expired SSL → `/ssl`) |

**Access:** All authenticated users.

---

## 2. Discovery

**URL:** `/discovery`  
**Purpose:** Scan nginx, PM2, IIS, and project folders; approve new app suggestions.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Run All Discovery** | Click **Run All Discovery** on Full Scan card | Admin+ |
| **Scan Nginx** | Nginx card → **Scan Nginx** — parses `D:\nginx\conf\sites\*.conf` | Admin+ |
| **Scan PM2** | PM2 card → **Scan PM2** — runs `pm2 jlist` | Admin+ |
| **Scan IIS** | IIS card → **Scan IIS** — PowerShell IIS module | Admin+ |
| **Scan Projects** | Applications card → **Scan Projects** — scans project directories | Admin+ |
| **Approve suggestion** | Pending table → Approve — creates Application record | Admin+ |
| **Reject suggestion** | Pending table → Reject | Admin+ |

### What each scan updates

| Scan | Database tables | Side effects |
|------|-----------------|--------------|
| Nginx | `nginx_configs`, `domains`, `ports` | Marks domains `discovered: true` |
| PM2 | `pm2_processes`, `ports` | Syncs status, PID, port from env |
| IIS | `iis_sites` | Bindings, app pool info |
| Projects | `discovery_suggestions` | Pending until approved |

**Tip:** Run **Scan Nginx** after editing site files on disk. Run **Scan PM2** after `pm2 start` / `pm2 restart`.

---

## 3. Applications

**URL:** `/applications`  
**Purpose:** Central application registry (metadata, paths, commands, status).

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Add** | **Add Application** → fill form → **Create** | Admin+ |
| **Edit** | Row → pencil icon → **Save Changes** | Admin+ |
| **Delete** | Row → trash → confirm | Admin+ |
| **Filter/view** | Browse table columns: status, tech, deploy type, client, path | All |

**Side effects:** JSON snapshot + audit log on every mutation.

**Detailed per-stack guide:** [Application Guide](./APPLICATION-GUIDE.md)

---

## 4. Domains

**URL:** `/domains`  
**Purpose:** Hostname registry linked to applications and nginx.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Add domain** | **Add Domain** → hostname, SSL flag, proxy_pass, target port, link application | Admin+ |
| **Edit** | Pencil → update fields → Save | Admin+ |
| **Delete** | Trash → confirm | Admin+ |

### Field guide

| Field | Example | Notes |
|-------|---------|-------|
| Hostname | `qc.amrikchhauni.in` | Lowercased on save |
| SSL Enabled | Yes | Informational; actual SSL in `/ssl` + nginx |
| Proxy Pass | `http://localhost:4800` | Nginx upstream |
| Target Port | `4800` | Auto-upserts port as `IN_USE` |
| Application | Query Cart | Optional link |

**Tip:** Nginx discovery auto-creates domains from site configs.

---

## 5. Ports

**URL:** `/ports`  
**Purpose:** Central port inventory (4000–9999 by default).

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Add port** | **Add Port** → number, status, optional app link | Admin+ |
| **Auto-assign** | **Auto-Assign Port** → creates next free port in range | Admin+ |
| **Edit** | Change status: `AVAILABLE`, `RESERVED`, `IN_USE`, `UNDER_CONSTRUCTION` | Admin+ |
| **Delete** | Remove port record | Admin+ |

### Status meanings

| Status | Meaning |
|--------|---------|
| `AVAILABLE` | Free for new apps |
| `RESERVED` | Allocated, not yet serving |
| `IN_USE` | Active traffic |
| `UNDER_CONSTRUCTION` | Dev/maintenance |

**Settings:** `ports.range_start`, `ports.range_end` in `/settings`.

---

## 6. Clients

**URL:** `/clients`  
**Purpose:** Client master data for linking to applications.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Add** | **Add Client** → name, company, email, phone, notes | Admin+ |
| **Edit** | Pencil → update → Save | Admin+ |
| **Delete** | Trash — blocked if applications are linked | Admin+ |

---

## 7. Idea Sources

**URL:** `/idea-sources`  
**Purpose:** Track project origin (Pavittar, Amrik, Client, etc.).

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Add** | **Add Idea Source** → name, description | Admin+ |
| **Edit** | Update name/description/active flag | Admin+ |
| **Delete** | Blocked if linked to applications | Admin+ |

**Seeded values:** Pavittar, Amrik, Sanjeev, Personal, Development, Hobby, Client, Hub

---

## 8. Technologies

**URL:** `/technologies`  
**Purpose:** Technology stack master data.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Add** | **Add Technology** → name, description | Admin+ |
| **Edit** | Update fields | Admin+ |
| **Delete** | Blocked if linked to applications | Admin+ |

**Seeded values:** Next.js, React, Node.js, Angular, ASP.NET, Python, Static HTML, .NET

---

## 9. Deployments

**URL:** `/deployments`  
**Purpose:** Read-only overview of deployment types and per-application deployment config.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| View deployment types | See PM2, IIS, PYTHON, STATIC, DOCKER, WINDOWS_SERVICE counts | All |
| View app deployments | Table: app name, status, type, technology, client, domain/port counts | All |

**Note:** No deployment workflow/history yet — metadata view only. To change deployment, edit the application in `/applications`.

---

## 10. Nginx

**URL:** `/nginx`  
**Purpose:** Manage site configuration files with backup, test, and reload.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Scan Sites** | **Scan Sites** — discovery from `paths.nginx_sites` | Admin+ |
| **Create config** | **Add Config** → filename, domain, port template or raw content | Admin+ |
| **Edit config** | Pencil → edit content → Save (auto-backup, `nginx -t`, rollback on fail) | Admin+ |
| **Restore backup** | In edit dialog → select backup → Restore | Admin+ |
| **Test** | **Test Config** — runs `nginx -t -p D:\nginx\` | Admin+ |
| **Reload** | **Reload Nginx** — applies config without full restart | Super Admin |
| **Restart** | **Restart Nginx** — Windows service restart | Super Admin |
| **Delete** | Remove config file + DB record | Admin+ |

### Safe edit workflow (automatic)

```
1. Backup → D:\server-config\backups\nginx\
2. Write file + update DB
3. nginx -t
4. Fail → rollback
5. Success → reload (Super Admin, auto after save)
```

---

## 11. PM2

**URL:** `/pm2`  
**Purpose:** Manage Node.js processes via PM2.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Scan PM2** | **Scan PM2** — sync from `pm2 jlist` | Admin+ |
| **Start** | Row → Start | Admin+ |
| **Stop** | Row → Stop | Admin+ |
| **Restart** | Row → Restart | Admin+ |
| **Delete** | Remove from PM2 + DB | Admin+ |
| **View logs** | Logs button — last 50 lines | Admin+ |
| **Save PM2** | **Save PM2** — persists process list (`pm2 save`) | Admin+ |
| **Link to app** | Select application from dropdown on row | Admin+ |

**Prerequisite:** PM2 must be installed and in PATH for the ACDM process (Windows: runs via `cmd.exe /c pm2`).

---

## 12. IIS

**URL:** `/iis`  
**Purpose:** Discover and manage IIS sites and app pools.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Scan IIS** | Discovery from PowerShell | Admin+ |
| **Start site** | Row → Start | Admin+ |
| **Stop site** | Row → Stop | Admin+ |
| **Restart site** | Row → Restart | Admin+ |
| **Start app pool** | App pool actions | Admin+ |
| **Recycle app pool** | Recycle button | Admin+ |
| **Link to app** | Link IIS site to application record | Admin+ |

**Patterns detected:** `ANGULAR_IIS`, `ASPNET_IIS`, `ANGULAR_IN_ASPNET`, `BOTH`, `UNKNOWN`

---

## 13. SSL Certificates

**URL:** `/ssl`  
**Purpose:** Win-ACME certificate discovery, renewal, and requests.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **View certificates** | Browse table with expiry badges | All |
| **Discover** | **Discover Certificates** — sync Win-ACME + cert store | Super Admin |
| **Renew** | Row → **Renew** — `wacs --renew --id` | Super Admin |
| **Request new** | **Request Certificate** → domain, email, webroot path | Super Admin |

### Expiry badges

| Badge | Meaning |
|-------|---------|
| valid | More than 30 days remaining |
| warning | Expires within 30 days |
| expired | Past expiry date |

**Settings:** `paths.win_acme` → `C:\win-acme\wacs.exe`

---

## 14. Maintenance

**URL:** `/maintenance`  
**Purpose:** Per-site or server-wide maintenance mode via nginx map.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Edit maintenance page** | Update title, description, expected return, logo URL → **Save Page Content** | Admin+ |
| **Enable site maintenance** | Per-site row → **Enable** | Admin+ |
| **Disable site maintenance** | Per-site row → **Disable** | Admin+ |
| **Server-wide maintenance** | **Enable Server Maintenance** (all sites) | Super Admin |

### How it works

- Generates `D:\server-config\maintenance\acdm-map.conf` (nginx `map $host`)
- Does **not** edit individual site configs on each toggle
- First toggle injects include into `nginx.conf` and maintenance check into `proxy-common.conf`
- Super Admin: auto nginx reload after toggle

---

## 15. Windows Services

**URL:** `/services`  
**Purpose:** Sync, whitelist, and control Windows services safely.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Sync services** | **Sync Services** — reads all Windows services | Admin+ |
| **Whitelist** | Toggle whitelist on a service | Super Admin |
| **Start** | Start whitelisted service only | Admin+ |
| **Stop** | Stop whitelisted service only | Admin+ |
| **Restart** | Restart whitelisted service only | Admin+ |

**Pre-whitelisted:** `nginx`, `postgresql-x64-18`

**Safety:** Non-whitelisted services cannot be started/stopped from ACDM.

---

## 16. Backups

**URL:** `/backups`  
**Purpose:** PostgreSQL database backup and restore.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **View backups** | Browse list with size, status, date | All |
| **Create backup** | **Create Backup** — `pg_dump` to `D:\server-config\backups\database\` | Super Admin |
| **Download** | Download icon → `.sql` file | Admin+ |
| **Restore** | Restore icon → confirm (overwrites DB) | Super Admin |
| **Delete** | Trash → removes file + record | Super Admin |

**Warning:** Restore replaces the entire database. Create a backup before restoring.

---

## 17. Audit Logs

**URL:** `/audit-logs`  
**Purpose:** View all platform mutations and activity.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Browse logs** | Paginated table — time, user, action, module, entity | All |
| **Filter** | Module dropdown, action dropdown, search box → **Filter** | All |
| **View detail** | Eye icon → before/after JSON | All |
| **Export CSV** | **Export CSV** — up to 1000 rows | All |

**Logged modules:** applications, domains, ports, nginx, pm2, iis, ssl, backups, maintenance, settings, users, clients, discovery, auth, services

---

## 18. Settings

**URL:** `/settings`  
**Purpose:** Infrastructure paths and configuration (all values in database, not hardcoded).

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **View settings** | Browse by category: paths, services, general, ports | Super Admin |
| **Edit setting** | Change value → Save | Super Admin |

### Key settings

| Key | Default | Purpose |
|-----|---------|---------|
| `paths.nginx_sites` | `D:\nginx\conf\sites` | Nginx site configs |
| `paths.nginx_root` | `D:\nginx` | Nginx installation |
| `paths.projects` | `D:\projects` | Project scan path |
| `paths.amrikprojects` | `D:\amrikprojects` | .NET/Angular projects |
| `paths.python` | `D:\python` | Python projects |
| `paths.win_acme` | `C:\win-acme\wacs.exe` | SSL tool |
| `paths.pg_dump` | PostgreSQL bin path | Database backups |
| `ports.range_start` | `4000` | Port auto-assign |
| `ports.range_end` | `9999` | Port auto-assign |
| `service.nginx_name` | `nginx` | Windows service name |

---

## 19. Users

**URL:** `/users`  
**Purpose:** User account and role management.

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **Add user** | **Add User** → username, password, role, active | Super Admin |
| **Edit user** | Change role, reset password, deactivate | Super Admin |
| **Delete user** | Trash — cannot delete yourself | Super Admin |

### Roles

Seed usernames and passwords are configured in `.env` (`SEED_USER_*` variables). See [SETUP.md](./SETUP.md).

---

## 20. Servers

**URL:** `/servers`  
**Purpose:** Server registry for multi-server support (current server flagged).

### Operations

| Action | Steps | Role |
|--------|-------|------|
| **View servers** | List with hostname, IP, environment | All |
| **Add server** | **Add Server** → name, hostname, IP, OS, environment | Admin+ |
| **Edit** | Update fields, set **Current Server** flag | Admin+ |
| **Delete** | Cannot delete the current server | Admin+ |

**Note:** Remote command execution is not implemented — registry is metadata for future use.

---

## Typical operational workflows

### Deploy a new Node/Next.js app

```
Discovery → Scan Projects (optional)
Applications → Add Application
Ports → Auto-Assign or manual port
Domains → Add hostname
Nginx → Create/edit site config → Test → Reload (Super Admin)
PM2 → start process on server → Scan PM2 → Link
SSL → Discover / Request
Applications → Status LIVE
```

### Put a site in maintenance

```
Maintenance → Edit page content (optional)
Maintenance → Enable per-site OR server-wide (Super Admin)
Verify site returns 503 with maintenance page
Maintenance → Disable when done
```

### Monthly maintenance checklist

```
Dashboard → check SSL expiry alerts
Backups → Create Backup (Super Admin)
Discovery → Run All Discovery
Audit Logs → review recent changes
SSL → Renew expiring certificates (Super Admin)
```

### Incident: site down

```
Dashboard → Quick Links
PM2 or IIS → check process/site status → Restart
Nginx → Test Config → check for errors
Ports → verify IN_USE and correct number
Domains → verify proxy_pass / target port
Audit Logs → find recent changes
```

---

## Module access matrix (summary)

| Module | View | Write | Super Admin only |
|--------|------|-------|------------------|
| Dashboard | All | — | — |
| Discovery | All | Admin+ | — |
| Applications | All | Admin+ | — |
| Domains | All | Admin+ | — |
| Ports | All | Admin+ | — |
| Clients | All | Admin+ | — |
| Idea Sources | All | Admin+ | — |
| Technologies | All | Admin+ | — |
| Deployments | All | — | — |
| Nginx | All | Admin+ | Reload, Restart |
| PM2 | All | Admin+ | — |
| IIS | All | Admin+ | — |
| SSL | All | — | Discover, Renew, Request |
| Maintenance | All | Admin+ | Server-wide + auto reload |
| Windows Services | All | Admin+ (whitelisted ops) | Whitelist toggle |
| Backups | All | Download: Admin+ | Create, Restore, Delete |
| Audit Logs | All | — | — |
| Settings | — | — | Super Admin |
| Users | — | — | Super Admin |
| Servers | All | Admin+ | — |

---

**Related docs:** [Application Guide](./APPLICATION-GUIDE.md) · [Setup](./SETUP.md) · [Architecture](./ARCHITECTURE.md)
