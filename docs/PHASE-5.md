## Phase 5 — SSL, Backups, Maintenance ✅

### SSL Certificates (Win-ACME)

| Action | Admin | Super Admin |
|--------|-------|-------------|
| View certificates | ✅ | ✅ |
| Discover from Win-ACME / cert store | ❌ | ✅ |
| Renew (`wacs --renew --id`) | ❌ | ✅ |
| Request new certificate (HTTP validation) | ❌ | ✅ |

**Discovery sources:**
1. `wacs.exe --list` — renewal IDs and domains
2. PowerShell certificate store — expiry dates and issuers

Certificates are stored in `ssl_certificates` with expiry status shown in the UI (valid / warning &lt;30 days / expired).

### Database Backups

| Action | Admin | Super Admin |
|--------|-------|-------------|
| View backup list | ✅ | ✅ |
| Download `.sql` file | ✅ | ✅ |
| Create backup (`pg_dump`) | ❌ | ✅ |
| Restore (`psql -f`) | ❌ | ✅ |
| Delete backup file | ❌ | ✅ |

Backups are written to `D:\server-config\backups\database\` with metadata in the `backups` table.

Download endpoint: `GET /api/backups/[id]/download`

### Maintenance Mode

Uses a **map-based nginx strategy** — individual site configs are not edited on each toggle.

| Action | Admin | Super Admin |
|--------|-------|-------------|
| Edit maintenance page HTML content | ✅ | ✅ |
| Enable/disable per-site maintenance | ✅ | ✅ |
| Server-wide maintenance | ❌ | ✅ |
| Auto nginx reload after toggle | ❌ | ✅ |

**One-time nginx setup** (on first toggle):
- Injects `include` for `D:\server-config\maintenance\acdm-map.conf` into `nginx.conf`
- Adds `if ($acdm_maintenance) { return 503; }` to `snippets/proxy-common.conf`
- Adds `error_page 503` pointing to generated `page.html`

**Generated files:**
- `maintenance/acdm-map.conf` — `map $host $acdm_maintenance`
- `maintenance/page.html` — branded maintenance page from DB content
- `maintenance/sites/{hostname}.conf` — per-site include metadata (reference)

### Files Added

```
src/lib/ssl/service.ts
src/lib/backups/service.ts
src/lib/maintenance/service.ts
src/actions/ssl.ts
src/actions/backups.ts
src/actions/maintenance.ts
src/components/ssl/ssl-manager.tsx
src/components/backups/backups-manager.tsx
src/components/maintenance/maintenance-manager.tsx
src/app/api/backups/[id]/download/route.ts
src/app/(app)/ssl/page.tsx
src/app/(app)/backups/page.tsx
src/app/(app)/maintenance/page.tsx
```

### Settings Used

- `paths.win_acme` — Win-ACME executable
- `paths.backups` — backup root directory
- `paths.maintenance` — maintenance HTML and map files
- `paths.nginx_conf` — nginx.conf and snippets
- `paths.pg_dump` — pg_dump executable
