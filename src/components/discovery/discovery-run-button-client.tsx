"use client";

import { useRouter } from "next/navigation";
import { DiscoveryRunButton } from "./discovery-run-button";
import type { DiscoveryActionState } from "@/actions/discovery";

interface DiscoveryRunButtonClientProps {
  label?: string;
  action: () => Promise<DiscoveryActionState>;
}

export function DiscoveryRunButtonClient({
  label,
  action,
}: DiscoveryRunButtonClientProps) {
  const router = useRouter();

  return (
    <DiscoveryRunButton
      label={label}
      onRun={action}
      onComplete={() => router.refresh()}
    />
  );
}
