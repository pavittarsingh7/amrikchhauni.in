export const NAV_MODULES = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { key: "discovery", label: "Discovery", href: "/discovery", icon: "Radar" },
  { key: "applications", label: "Applications", href: "/applications", icon: "AppWindow" },
  { key: "domains", label: "Domains", href: "/domains", icon: "Globe" },
  { key: "ports", label: "Ports", href: "/ports", icon: "Network" },
  { key: "clients", label: "Clients", href: "/clients", icon: "Users" },
  { key: "idea-sources", label: "Idea Sources", href: "/idea-sources", icon: "Lightbulb" },
  { key: "technologies", label: "Technologies", href: "/technologies", icon: "Cpu" },
  { key: "deployments", label: "Deployments", href: "/deployments", icon: "Rocket" },
  { key: "nginx", label: "Nginx", href: "/nginx", icon: "Server" },
  { key: "pm2", label: "PM2", href: "/pm2", icon: "Activity" },
  { key: "iis", label: "IIS", href: "/iis", icon: "Monitor" },
  { key: "ssl", label: "SSL", href: "/ssl", icon: "Shield" },
  { key: "maintenance", label: "Maintenance", href: "/maintenance", icon: "Construction" },
  { key: "services", label: "Windows Services", href: "/services", icon: "Cog" },
  { key: "backups", label: "Backups", href: "/backups", icon: "Database" },
  { key: "audit-logs", label: "Audit Logs", href: "/audit-logs", icon: "ScrollText" },
  { key: "docs", label: "Documentation", href: "/docs", icon: "BookOpen" },
  { key: "settings", label: "Settings", href: "/settings", icon: "Settings", superAdminOnly: true },
  { key: "users", label: "Users", href: "/users", icon: "UserCog", superAdminOnly: true },
  { key: "servers", label: "Servers", href: "/servers", icon: "HardDrive" },
] as const;

export type NavModule = (typeof NAV_MODULES)[number];

export function getNavForRole(role: string) {
  return NAV_MODULES.filter(
    (m) => !("superAdminOnly" in m && m.superAdminOnly) || role === "SUPER_ADMIN"
  );
}
