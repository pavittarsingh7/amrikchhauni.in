# Application Guide — Add, Edit, Delete by Tech Stack

This guide explains how to register, update, and remove applications in ACDM for each technology and deployment type used on the Amrik Chhauni server.

**UI location:** `/applications` → **Add Application** / row actions (edit, delete)

**Required role:** Administrator or Super Admin for create/edit/delete. Viewers can only browse.

---

## Table of Contents

1. [Common concepts](#common-concepts)
2. [End-to-end workflow](#end-to-end-workflow)
3. [Next.js](#nextjs)
4. [React / Node.js](#react--nodejs)
5. [Angular](#angular)
6. [ASP.NET](#aspnet)
7. [Python](#python)
8. [Static HTML](#static-html)
9. [Docker](#docker)
10. [Windows Service](#windows-service)
11. [Editing an application](#editing-an-application)
12. [Deleting an application](#deleting-an-application)
13. [Discovery alternative](#discovery-alternative)
14. [Troubleshooting](#troubleshooting)

---

## Common concepts

### Application form fields

| Field | Required | Purpose |
|-------|----------|---------|
| **Name** | Yes | Display name in ACDM |
| **Status** | Yes | `LIVE`, `PLANNED`, `BETA`, `UNDER_CONSTRUCTION`, `ARCHIVED` |
| **Technology** | Recommended | Master data: Next.js, React, Node.js, Angular, ASP.NET, Python, Static HTML, .NET |
| **Deployment Type** | Recommended | How the app runs: PM2, IIS, PYTHON, STATIC, DOCKER, WINDOWS_SERVICE |
| **Idea Source** | Optional | Pavittar, Amrik, Sanjeev, Personal, Development, Hobby, Client, Hub |
| **Client** | Optional | Link to a client record (`/clients`) |
| **Repository URL** | Optional | Git remote |
| **Branch** | Optional | Default `main` |
| **Project Path** | Strongly recommended | Absolute path on disk, e.g. `D:\projects\my-app` |
| **Build Command** | Stack-dependent | Run before deploy |
| **Start Command** | Stack-dependent | How the process is started locally / in PM2 |
| **Description / Notes / Remarks** | Optional | Internal documentation |
| **Featured** | Optional | Highlight on hub listings |

### What ACDM stores vs what you configure elsewhere

Registering an application in ACDM **does not** automatically:

- Start PM2 or IIS
- Create nginx site configs
- Assign SSL certificates

After creating the app record, you typically also configure:

| Step | Module | Action |
|------|--------|--------|
| 1 | **Ports** | Reserve or assign a port (`IN_USE`) |
| 2 | **Domains** | Add hostname, link to app, set `proxy_pass` port |
| 3 | **Nginx** | Create/edit site config, test, reload |
| 4 | **PM2** or **IIS** | Start process / site and link to application |
| 5 | **SSL** | Discover or request certificate (Super Admin) |

Every create/update/delete writes to PostgreSQL, a JSON snapshot under `D:\server-config\snapshots\applications\`, and an audit log entry.

### Technology → deployment type (recommended pairing)

| Technology | Typical deployment type | Runtime |
|------------|-------------------------|---------|
| Next.js | PM2 | Node process on a port |
| React / Node.js | PM2 | Node process on a port |
| Angular | IIS | IIS site + app pool |
| ASP.NET / .NET | IIS | IIS site + app pool |
| Python | PYTHON | PM2 or manual (Flask/FastAPI/Django) |
| Static HTML | STATIC | Nginx `root` or IIS static site |
| Containerized app | DOCKER | Docker (manual; ACDM tracks metadata only) |
| Background Windows service | WINDOWS_SERVICE | Windows Service (whitelist in `/services`) |

---

## End-to-end workflow

Example: new Next.js app `my-shop` at `https://shop.amrikchhauni.in` on port `5010`.

```
1. Applications  → Add Application (fill form)
2. Ports         → Add port 5010, status IN_USE, link to app
3. Domains       → Add shop.amrikchhauni.in, target port 5010, link to app
4. Nginx         → Create site config (or generate template), test, reload
5. PM2           → Scan PM2, link process to app, start if needed
6. SSL           → Discover / renew certificate
7. Applications  → Set status LIVE
```

---

## Next.js

**Deployment type:** `PM2`  
**Typical path:** `D:\projects\<app-name>` or `D:\amrikchhauni.in` (this platform)

### Add — example: ACDM itself

| Field | Example value |
|-------|---------------|
| Name | `ACDM` |
| Status | `LIVE` |
| Technology | `Next.js` |
| Deployment Type | `PM2` |
| Idea Source | `Development` |
| Project Path | `D:\amrikchhauni.in` |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Branch | `main` |
| Notes | Internal deployment manager |

**Server steps after save:**

```powershell
cd D:\amrikchhauni.in
npm run build
pm2 start ecosystem.config.cjs --only acdm
pm2 save
```

Then in ACDM: **PM2** → Scan PM2 → link `acdm` process to this application.

### Add — example: Query Cart (from seed data)

| Field | Example value |
|-------|---------------|
| Name | `Query Cart` |
| Status | `LIVE` |
| Technology | `Next.js` or `React` |
| Deployment Type | `PM2` |
| Idea Source | `Pavittar` |
| Client | `Client Projects` |
| Project Path | `D:\projects\query-cart` |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Notes | Port 4800, qc.amrikchhauni.in |

**Port:** `4800` — status `IN_USE`  
**Domain:** `qc.amrikchhauni.in` — SSL on, proxy to `http://localhost:4800`

### Edit

Common edits:

- Status `BETA` → `LIVE` when going production
- Update `buildCommand` / `startCommand` after changing `package.json` scripts
- Change `projectPath` after moving the repo

### Delete

- Unlinks domains and ports (they remain in DB but lose `applicationId` on cascade rules — verify linked records first)
- Does **not** stop PM2 or remove nginx config — do that manually before delete

---

## React / Node.js

**Deployment type:** `PM2`  
**Detection:** `package.json` with `react` (no `next`)

### Add — example: Development Sandbox

| Field | Example value |
|-------|---------------|
| Name | `Development Sandbox` |
| Status | `BETA` |
| Technology | `React` or `Node.js` |
| Deployment Type | `PM2` |
| Idea Source | `Development` |
| Project Path | `D:\projects\dev-sandbox` |
| Build Command | `npm run build` |
| Start Command | `node server.js` or `npm start` |
| Remarks | May be unstable — port 9090 |

**Port:** `9090`  
**Domain:** `ds.amrikchhauni.in`

### Add — example: Express API only

| Field | Example value |
|-------|---------------|
| Name | `WA Dashboard API` |
| Technology | `Node.js` |
| Deployment Type | `PM2` |
| Project Path | `D:\projects\wa-dashboard` |
| Build Command | *(leave empty if no build step)* |
| Start Command | `node dist/index.js` |

### PM2 ecosystem tip

If using `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: "wa-dashboard",
    cwd: "D:\\projects\\wa-dashboard",
    script: "dist/index.js",
    env: { PORT: 6002, NODE_ENV: "production" },
  }],
};
```

Set **PORT** in PM2 env; discovery will pick it up on **Scan PM2**.

---

## Angular

**Deployment type:** `IIS`  
**Detection:** `angular.json` or `@angular/core` in `package.json`

### Add — example: Taste of Panjab (.NET + Angular)

| Field | Example value |
|-------|---------------|
| Name | `Taste of Panjab` |
| Status | `LIVE` |
| Technology | `Angular` |
| Deployment Type | `IIS` |
| Idea Source | `Amrik` |
| Project Path | `D:\amrikprojects\tasteofpanjab` |
| Build Command | `ng build --configuration production` |
| Start Command | *(IIS serves publish output — leave empty or note publish folder)* |
| Remarks | .NET + Angular — IIS pattern ANGULAR_IN_ASPNET possible |
| Featured | Yes |

**Port:** `4001` (if reverse-proxied via nginx) or IIS bindings directly  
**Domain:** `tasteofpanjab.amrikchhauni.in`

**Server steps:**

1. Publish Angular / ASP.NET bundle to IIS physical path
2. Create IIS site in IIS Manager (or use existing)
3. ACDM **IIS** → Scan IIS → link site to application
4. Nginx reverse proxy to IIS binding if using subdomain pattern

### IIS-only Angular (standalone)

| Field | Example value |
|-------|---------------|
| Technology | `Angular` |
| Deployment Type | `IIS` |
| Project Path | `D:\projects\my-angular-app` |
| Build Command | `ng build` |

Discovery pattern: `ANGULAR_IIS`

---

## ASP.NET

**Deployment type:** `IIS`  
**Detection:** `*.csproj` in project folder

### Add — example: ASP.NET Web API

| Field | Example value |
|-------|---------------|
| Name | `GSMS` |
| Status | `UNDER_CONSTRUCTION` |
| Technology | `ASP.NET` |
| Deployment Type | `IIS` |
| Idea Source | `Hobby` |
| Project Path | `D:\amrikprojects\gsms` |
| Build Command | `dotnet publish -c Release` |
| Start Command | *(IIS handles — note publish output path in Notes)* |
| Notes | Gurdwara Sahib Management System |

**Port:** `5005` (via nginx proxy) or IIS `http://*:port` binding

**Server steps:**

```powershell
cd D:\amrikprojects\gsms
dotnet publish -c Release -o D:\publish\gsms
```

Point IIS site physical path to publish folder. **IIS** module → start site, recycle app pool as needed.

### Edit

- Update status from `UNDER_CONSTRUCTION` → `LIVE` when deployed
- Update `projectPath` / notes when solution is renamed

---

## Python

**Deployment type:** `PYTHON`  
**Detection:** `requirements.txt` or `pyproject.toml`  
**Scan path:** `D:\python` (configurable in Settings → `paths.python`)

### Add — example: FastAPI service

| Field | Example value |
|-------|---------------|
| Name | `Smart Kharcha AI` |
| Status | `LIVE` |
| Technology | `Python` |
| Deployment Type | `PYTHON` |
| Idea Source | `Personal` |
| Project Path | `D:\python\smart-kharcha` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port 5008` |
| Notes | Run under PM2 with interpreter |

**PM2 example:**

```powershell
pm2 start "D:\python\venv\Scripts\uvicorn.exe" --name smart-kharcha -- main:app --host 0.0.0.0 --port 5008
pm2 save
```

**Port:** `5008` — link in Ports module  
**Domain:** configure in Domains + Nginx

### Add — example: Flask app

| Field | Example value |
|-------|---------------|
| Start Command | `python app.py` or `gunicorn app:app -b 0.0.0.0:5012` |
| Build Command | `pip install -r requirements.txt` |

Use a virtualenv path in `projectPath` notes if needed.

---

## Static HTML

**Deployment type:** `STATIC`  
**Detection:** `index.html` present, no `package.json`

### Add — example: simple landing page

| Field | Example value |
|-------|---------------|
| Name | `Pavittar Portfolio` |
| Status | `LIVE` |
| Technology | `Static HTML` |
| Deployment Type | `STATIC` |
| Idea Source | `Hobby` |
| Project Path | `D:\projects\pavittar-portfolio` |
| Build Command | *(empty)* |
| Start Command | *(empty — served by nginx root or IIS)* |

**Nginx option** — set domain `root_path` instead of `proxy_pass`:

```
root D:/projects/pavittar-portfolio;
index index.html;
```

In ACDM **Domains**, set **Root Path** to the folder; nginx config uses `root` directive.

**Port:** optional if nginx serves files directly on 443; otherwise reserve a port if using a small static server.

---

## Docker

**Deployment type:** `DOCKER`  
**Note:** ACDM tracks metadata only. Container lifecycle is manual.

### Add — example

| Field | Example value |
|-------|---------------|
| Name | `My Containerized API` |
| Technology | `Node.js` |
| Deployment Type | `DOCKER` |
| Project Path | `D:\projects\my-api` |
| Build Command | `docker build -t my-api .` |
| Start Command | `docker run -d -p 5020:3000 --name my-api my-api` |
| Notes | Port mapping 5020:3000 |

**Port:** `5020` in Ports module  
**Domain:** proxy_pass to `http://localhost:5020`

---

## Windows Service

**Deployment type:** `WINDOWS_SERVICE`  
**Use when:** app runs as a native Windows service (not PM2/IIS)

### Add — example

| Field | Example value |
|-------|---------------|
| Name | `Custom Background Worker` |
| Technology | `.NET` or `Node.js` |
| Deployment Type | `WINDOWS_SERVICE` |
| Project Path | `D:\services\worker` |
| Notes | Service name: MyWorkerService |

**Operations:**

1. Register service in Windows (`sc create` or installer)
2. **Windows Services** (`/services`) → Sync → Super Admin whitelists the service name
3. Start/stop/restart only whitelisted services from ACDM

Pre-whitelisted: `nginx`, `postgresql-x64-18`

---

## Editing an application

1. Go to `/applications`
2. Click the **pencil** icon on the row
3. Modify fields in the dialog → **Save Changes**

### Common edit scenarios

| Scenario | Fields to update |
|----------|------------------|
| Moved repo | `projectPath` |
| New git remote | `repositoryUrl`, `branch` |
| Changed npm scripts | `buildCommand`, `startCommand` |
| Went live | `status` → `LIVE` |
| Client handoff | `clientId`, `ideaSource` → `Client` |
| Deprecation | `status` → `ARCHIVED`, add note in `remarks` |

Updates create a new JSON snapshot and audit log with before/after state.

---

## Deleting an application

1. Go to `/applications`
2. Click the **trash** icon
3. Confirm in the dialog

### Before you delete

| Check | Why |
|-------|-----|
| Linked domains | Orphaned or deleted per DB cascade — update nginx manually |
| Linked ports | May become AVAILABLE or need cleanup |
| PM2 process | Stop/delete in `/pm2` if no longer needed |
| IIS site | Stop in `/iis` if applicable |
| Nginx config | Remove site file in `/nginx` |

**ACDM does not** remove nginx files, PM2 processes, or IIS sites when you delete the application record.

---

## Discovery alternative

Instead of manual add, use **Discovery** (`/discovery`):

1. **Scan Projects** — scans `paths.projects`, `paths.amrikprojects`, `paths.python`
2. Review **Pending Application Suggestions** on `/discovery` or `/applications`
3. **Approve** → creates application with detected technology and deployment type
4. **Reject** → dismisses suggestion

Approved apps still need ports, domains, nginx, and runtime linking as described above.

### Auto-detection rules (discovery)

| Detected files | Technology | Deployment type |
|----------------|------------|-----------------|
| `package.json` + `next` | Next.js | PM2 |
| `package.json` + `react` | React | PM2 |
| `angular.json` | Angular | IIS |
| `*.csproj` | ASP.NET | IIS |
| `requirements.txt` / `pyproject.toml` | Python | PYTHON |
| `index.html` only | Static HTML | STATIC |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Form validation error on URL | Leave Repository URL empty or use full `https://...` URL |
| Client dropdown empty | Add clients in `/clients` first |
| Technology not in list | Add in `/technologies` (Administrator+) |
| Port already in use | Pick another via Ports → auto-assign or manual number |
| App LIVE but 502 | Check PM2/IIS running, nginx `proxy_pass` port matches |
| PM2 scan shows nothing | Ensure process running; PM2 must be in server PATH |
| Changes not visible | Refresh page; check Audit Logs for the UPDATE entry |

---

## Quick reference — real projects on this server

| App | Tech | Deploy | Port | Domain |
|-----|------|--------|------|--------|
| Query Cart | Node/React | PM2 | 4800 | qc.amrikchhauni.in |
| Pavittar Portfolio | Static/Node | PM2/STATIC | 5001 | ps.amrikchhauni.in |
| Development Sandbox | React | PM2 | 9090 | ds.amrikchhauni.in |
| Taste of Panjab | Angular | IIS | 4001 | tasteofpanjab.amrikchhauni.in |
| WA Dashboard | Node.js | PM2 | 6002 | wa.amrikchhauni.in |
| ID Card Generator | Node.js | PM2 | 4900 | idcardgenerator.amrikchhauni.in |

See `projects.json` in the repo root for the full seed list.

---

**Related docs:** [Module Operations Guide](./MODULE-OPERATIONS.md) · [Setup](./SETUP.md) · [Architecture](./ARCHITECTURE.md)
