"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HubHeaderProps {
  view: "cards" | "table";
}

export function HubHeader({ view }: HubHeaderProps) {
  const router = useRouter();

  return (
    <header className="mb-10 flex items-center justify-between opacity-0-start animate-fade-up">
      <Link href="/" className="group flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105">
          AC
        </span>
        <div>
          <p className="font-display text-lg font-semibold tracking-tight hub-title">
            amrikchhauni.in
          </p>
          <p className="text-xs hub-muted">
            Development &amp; demo hub
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="sm"
          onPress={() => router.push(view === "cards" ? "/table" : "/")}
        >
          {view === "cards" ? "Table view" : "Card view"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="hidden sm:inline-flex"
          onPress={() => router.push("/login")}
        >
          Admin
        </Button>
        <ThemeToggle className="rounded-xl" />
      </div>
    </header>
  );
}
