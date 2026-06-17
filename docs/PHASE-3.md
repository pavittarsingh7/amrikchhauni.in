## Phase 3 — Applications, Domains, Ports CRUD ✅

### Features

| Module | Create | Read | Update | Delete | Extras |
|--------|--------|------|--------|--------|--------|
| **Applications** | ✅ | ✅ | ✅ | ✅ | Full metadata form, master data selects |
| **Domains** | ✅ | ✅ | ✅ | ✅ | Links to applications, syncs target port |
| **Ports** | ✅ | ✅ | ✅ | ✅ | Auto-assign next free port |

### Dual Storage Pattern

Every create, update, and delete:
1. Persists to PostgreSQL
2. Creates JSON snapshot in `D:\server-config\snapshots\{entity}\`
3. Writes audit log with before/after state

### Port Auto-Assign

Uses configurable range from Settings:
- `ports.range_start` (default 4000)
- `ports.range_end` (default 9999)

Finds the first port number not already in the registry.

### Role Access

| Action | VIEWER | ADMINISTRATOR | SUPER_ADMIN |
|--------|--------|---------------|-------------|
| View lists | ✅ | ✅ | ✅ |
| Create/Edit/Delete | ❌ | ✅ | ✅ |

### File Structure

```
src/lib/validations/crud.ts
src/lib/applications/service.ts
src/lib/domains/service.ts
src/lib/ports/service.ts
src/actions/applications.ts
src/actions/domains.ts
src/actions/ports.ts
src/components/crud/
src/components/applications/applications-manager.tsx
src/components/domains/domains-manager.tsx
src/components/ports/ports-manager.tsx
```
