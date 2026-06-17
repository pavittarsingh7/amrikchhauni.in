"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Check, X } from "lucide-react";
import { approveSuggestionAction, rejectSuggestionAction } from "@/actions/discovery";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import type { ApplicationDiscovery } from "@/lib/discovery/types";

interface Suggestion {
  id: string;
  name: string;
  source: string;
  data: ApplicationDiscovery;
  createdAt: Date;
}

interface SuggestionsTableProps {
  suggestions: Suggestion[];
  readOnly?: boolean;
}

export function SuggestionsTable({
  suggestions,
  readOnly = false,
}: SuggestionsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);

  function handleApprove(id: string) {
    setActingId(id);
    startTransition(async () => {
      await approveSuggestionAction(id);
      setActingId(null);
      router.refresh();
    });
  }

  function handleReject(id: string) {
    setActingId(id);
    startTransition(async () => {
      await rejectSuggestionAction(id);
      setActingId(null);
      router.refresh();
    });
  }

  const columns = [
    { key: "name", header: "Name" },
    {
      key: "technology",
      header: "Technology",
      render: (row: Suggestion) => (
        <StatusBadge status={row.data.technology} />
      ),
    },
    {
      key: "deploymentType",
      header: "Deploy Type",
      render: (row: Suggestion) => row.data.deploymentType,
    },
    {
      key: "projectPath",
      header: "Path",
      className: "font-mono text-xs max-w-xs truncate",
      render: (row: Suggestion) => row.data.projectPath,
    },
    {
      key: "source",
      header: "Source",
      className: "text-xs text-slate-500",
    },
    ...(readOnly
      ? []
      : [
          {
            key: "actions",
            header: "Actions",
            render: (row: Suggestion) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  isDisabled={isPending && actingId === row.id}
                  onPress={() => handleApprove(row.id)}
                  className="gap-1 min-w-0 px-2"
                >
                  <Check className="w-3 h-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={isPending && actingId === row.id}
                  onPress={() => handleReject(row.id)}
                  className="gap-1 min-w-0 px-2 text-red-400"
                >
                  <X className="w-3 h-3" />
                  Reject
                </Button>
              </div>
            ),
          },
        ]),
  ];

  return (
    <DataTable
      keyField="id"
      data={suggestions}
      emptyMessage="No pending discovery suggestions"
      columns={columns}
    />
  );
}
