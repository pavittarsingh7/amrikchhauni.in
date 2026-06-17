"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  AppWindow,
  Globe,
  Network,
  Users,
  Lightbulb,
  Cpu,
  Rocket,
  Server,
  Activity,
  Monitor,
  Shield,
  Construction,
  Cog,
  Database,
  ScrollText,
  Settings,
  UserCog,
  HardDrive,
  LogOut,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@heroui/react";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getNavForRole } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/db/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Radar,
  AppWindow,
  Globe,
  Network,
  Users,
  Lightbulb,
  Cpu,
  Rocket,
  Server,
  Activity,
  Monitor,
  Shield,
  Construction,
  Cog,
  Database,
  ScrollText,
  BookOpen,
  Settings,
  UserCog,
  HardDrive,
};

interface SidebarProps {
  user: { username: string; role: UserRole };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavForRole(user.role);

  return (
    <aside
      className={`flex flex-col h-screen border-r transition-all duration-200 bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
              ACDM
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">Deployment Manager</p>
          </div>
        )}
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/15 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user.username}
            </p>
            <p className="text-xs text-slate-500">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        )}
        <div className="mb-3 flex items-center gap-2">
          <ThemeToggle />
          {!collapsed && (
            <span className="text-xs text-slate-500">Theme</span>
          )}
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-600 dark:text-slate-400"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </form>
      </div>
    </aside>
  );
}
