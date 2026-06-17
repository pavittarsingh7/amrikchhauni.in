import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={session} />
      <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950">
        {children}
      </main>
    </div>
  );
}
