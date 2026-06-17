## Phase 4 — Nginx, PM2, IIS, Windows Services ✅

### Nginx Management

| Action | Admin | Super Admin |
|--------|-------|-------------|
| View / Create / Edit / Delete | ✅ | ✅ |
| Backup (automatic on edit) | ✅ | ✅ |
| Restore from backup | ✅ | ✅ |
| Test (`nginx -t`) | ✅ | ✅ |
| Reload | ❌ | ✅ |
| Restart service | ❌ | ✅ |

**Change workflow:**
1. Backup current config to `D:\server-config\backups\nginx\`
2. Write file + update database
3. Run `nginx -t -p {nginx_root}`
4. On failure → automatic rollback
5. On success → reload (Super Admin only, auto after save)

### PM2 Management

- Start / Stop / Restart processes
- Delete from PM2
- View logs (`pm2 logs --nostream`)
- Save PM2 list (`pm2 save`)
- Link processes to applications

### IIS Management

- Start / Stop / Restart sites
- Start / Recycle app pools
- Link sites to applications
- Pattern detection from discovery (Phase 2)

### Windows Services

- Sync all Windows services from OS
- Whitelist management (Super Admin only)
- Start / Stop / Restart whitelisted services only
- Pre-seeded whitelist: `nginx`, `postgresql-x64-18`

### File Structure

```
src/lib/nginx/service.ts
src/lib/pm2/service.ts
src/lib/iis/service.ts
src/lib/windows-services/service.ts
src/actions/nginx.ts
src/actions/pm2.ts
src/actions/iis.ts
src/actions/services.ts
src/components/nginx/nginx-manager.tsx
src/components/pm2/pm2-manager.tsx
src/components/iis/iis-manager.tsx
src/components/services/services-manager.tsx
```
