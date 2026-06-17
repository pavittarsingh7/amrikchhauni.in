"use client";

import { useRouter } from "next/navigation";
import { Card } from "@heroui/react";
import { DiscoveryRunButton } from "@/components/discovery/discovery-run-button";
import {
  runAllDiscoveryAction,
  runNginxDiscoveryAction,
  runPm2DiscoveryAction,
  runIisDiscoveryAction,
  runApplicationDiscoveryAction,
} from "@/actions/discovery";

interface DiscoveryHubClientProps {
  readOnly?: boolean;
}

const SCANNERS = [
  {
    key: "all",
    title: "Full Scan",
    description: "Run all discovery services at once",
    action: runAllDiscoveryAction,
    label: "Run All Discovery",
  },
  {
    key: "nginx",
    title: "Nginx",
    description: "Parse site configs from D:\\nginx\\conf\\sites",
    action: runNginxDiscoveryAction,
    label: "Scan Nginx",
  },
  {
    key: "pm2",
    title: "PM2",
    description: "List running PM2 processes and ports",
    action: runPm2DiscoveryAction,
    label: "Scan PM2",
  },
  {
    key: "iis",
    title: "IIS",
    description: "Discover IIS sites, bindings, and app pools",
    action: runIisDiscoveryAction,
    label: "Scan IIS",
  },
  {
    key: "apps",
    title: "Applications",
    description: "Scan project directories for new apps",
    action: runApplicationDiscoveryAction,
    label: "Scan Projects",
  },
] as const;

export function DiscoveryHubClient({ readOnly = false }: DiscoveryHubClientProps) {
  const router = useRouter();

  if (readOnly) {
    return (
      <p className="text-sm text-slate-500">
        Discovery scans require Administrator or Super Admin access.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {SCANNERS.map((scanner) => (
        <Card key={scanner.key} className="bg-slate-900 border border-slate-800">
          <Card.Header>
            <Card.Title className="text-white text-base">{scanner.title}</Card.Title>
            <Card.Description className="text-sm">
              {scanner.description}
            </Card.Description>
          </Card.Header>
          <Card.Content className="flex justify-end">
            <DiscoveryRunButton
              label={scanner.label}
              variant={scanner.key === "all" ? "primary" : "secondary"}
              onRun={scanner.action}
              onComplete={() => router.refresh()}
            />
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
