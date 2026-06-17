## Phase 6 — Dashboard, Reporting, Audit Logs ✅

### Dashboard Reporting

The dashboard aggregates cross-module KPIs:

| Widget | Data Source |
|--------|-------------|
| Application / domain / port counts | `applications`, `domains`, `ports` |
| PM2 / IIS / nginx counts | Infra tables |
| SSL expiry warnings | `ssl_certificates` (30-day window) |
| Backup status | `backups` via `getBackupStats()` |
| Pending discovery | `discovery_suggestions` |
| Recent activity | Last 8 `audit_logs` |
| Apps by status | `groupBy` on application status |
| Audit by module (30d) | `groupBy` on audit module |
| Quick links | Alerts for SSL, maintenance, backups, discovery |

### Audit Logs UI

| Feature | Access |
|---------|--------|
| View paginated logs | All authenticated roles |
| Filter by module / action | All roles |
| Search (user, module, entity) | All roles |
| View before/after JSON detail | All roles |
| Export CSV (up to 1000 rows) | All roles |

**Service:** `src/lib/audit/service.ts` — `listAuditLogs`, `getAuditLog`, `getAuditFilterOptions`, `getRecentAuditLogs`, `getAuditStatsByModule`

### Deferred Modules Completed

Phase 6 also implemented modules that were deferred from earlier phases:

| Module | Phase | Notes |
|--------|-------|-------|
| Users CRUD | Phase 1 | Super Admin only; bcrypt cost 12 |
| Clients CRUD | Phase 3 | Linked to applications |
| Idea Sources CRUD | Phase 3 | Master data |
| Technologies CRUD | Phase 3 | Master data |
| Servers registry | Phase 1 | Multi-server prep; current flag |
| Deployments overview | Phase 3 | Read-only; no workflow model yet |

### Files Added

```
src/lib/audit/service.ts
src/lib/dashboard/stats.ts
src/lib/clients/service.ts
src/lib/idea-sources/service.ts
src/lib/technologies/service.ts
src/lib/users/service.ts
src/actions/audit.ts
src/actions/clients.ts
src/actions/idea-sources.ts
src/actions/technologies.ts
src/actions/users.ts
src/components/audit/audit-logs-manager.tsx
src/components/clients/clients-manager.tsx
src/components/idea-sources/idea-sources-manager.tsx
src/components/technologies/technologies-manager.tsx
src/components/users/users-manager.tsx
src/components/servers/servers-manager.tsx
src/components/deployments/deployments-manager.tsx
```

### Seed Updates

- `Hub` idea source added
- Sample clients seeded
- Admin password hash aligned to bcrypt cost 12; credentials read from `.env` (`SEED_USER_*`)

### Not in Scope (Future)

- Deployment workflow / history model
- JSON snapshot browse/restore UI
- Remote multi-server command execution
- Docker management
