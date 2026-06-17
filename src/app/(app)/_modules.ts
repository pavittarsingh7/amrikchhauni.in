// Module phase registry — each module has its own page.tsx

const modules = [
  { path: "domains", title: "Domains", desc: "Manage domain configurations and SSL bindings", phase: "Phase 3" },
  { path: "ports", title: "Ports", desc: "Centralized port inventory and assignment", phase: "Phase 3" },
  { path: "clients", title: "Clients", desc: "Manage client records linked to applications", phase: "Phase 3" },
  { path: "idea-sources", title: "Idea Sources", desc: "Track project origin and ownership", phase: "Phase 3" },
  { path: "technologies", title: "Technologies", desc: "Technology stack master data", phase: "Phase 3" },
  { path: "deployments", title: "Deployments", desc: "Deployment types and application overview", phase: "Phase 3" },
  { path: "nginx", title: "Nginx", desc: "View, edit, backup, and reload Nginx configurations", phase: "Phase 4" },
  { path: "pm2", title: "PM2", desc: "Manage PM2 processes and ecosystem configs", phase: "Phase 4" },
  { path: "iis", title: "IIS", desc: "Discover and manage IIS sites and app pools", phase: "Phase 4" },
  { path: "ssl", title: "SSL Certificates", desc: "Manage certificates via Win-ACME", phase: "Phase 5" },
  { path: "maintenance", title: "Maintenance", desc: "Enable maintenance mode per site or server-wide", phase: "Phase 5" },
  { path: "services", title: "Windows Services", desc: "Start, stop, and restart whitelisted services", phase: "Phase 4" },
  { path: "backups", title: "Backups", desc: "Database and configuration backup management", phase: "Phase 5" },
  { path: "audit-logs", title: "Audit Logs", desc: "View all platform activity and changes", phase: "Phase 6" },
  { path: "users", title: "Users", desc: "Manage user accounts and roles", phase: "Phase 1" },
  { path: "servers", title: "Servers", desc: "Server registry for multi-server support", phase: "Phase 1" },
];

// This file is a reference — each module has its own page.tsx

export { modules };
