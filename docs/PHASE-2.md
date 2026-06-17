## Phase 2 — Discovery Services ✅

### Services Implemented

| Service | Source | Persists To |
|---------|--------|-------------|
| Nginx Discovery | `paths.nginx_sites` (*.conf) | `nginx_configs`, `domains`, `ports` |
| PM2 Discovery | `pm2 jlist` | `pm2_processes`, `ports` |
| IIS Discovery | PowerShell `Get-IISSite` | `iis_sites` |
| Application Discovery | `paths.projects`, `paths.amrikprojects`, `paths.python` | `discovery_suggestions` (pending) |

### Application Detection

Scans top-level project folders and detects:
- **Next.js** — `package.json` with `next` dependency
- **React** — `package.json` with `react`
- **Angular** — `angular.json` or `@angular/core`
- **ASP.NET** — `*.csproj` files
- **Python** — `requirements.txt`, `pyproject.toml`
- **Static HTML** — `index.html` without package.json

### IIS Pattern Detection

- `ANGULAR_IIS` — standalone Angular site
- `ASPNET_IIS` — standalone ASP.NET site
- `ANGULAR_IN_ASPNET` — Angular inside ASP.NET publish
- `BOTH` — both patterns coexist
- `UNKNOWN` — unclassified

### Approval Workflow

Application discovery creates `DiscoverySuggestion` records with `PENDING` status.
Administrators can **Approve** (creates Application record) or **Reject** from:
- `/discovery`
- `/applications`

### API / Actions

- `runNginxDiscoveryAction`
- `runPm2DiscoveryAction`
- `runIisDiscoveryAction`
- `runApplicationDiscoveryAction`
- `runAllDiscoveryAction`
- `approveSuggestionAction`
- `rejectSuggestionAction`

All discovery actions require Administrator or Super Admin role.

### File Structure

```
src/lib/discovery/
├── types.ts
├── nginx.ts
├── pm2.ts
├── iis.ts
├── applications.ts
└── persist.ts

src/lib/shell/exec.ts
src/actions/discovery.ts
src/components/discovery/
```
