"use client";

import { useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { RefreshCw } from "lucide-react";

interface DiscoveryRunButtonProps {
  label?: string;
  onRun: () => Promise<{ error?: string }>;
  onComplete?: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

export function DiscoveryRunButton({
  label = "Run Discovery",
  onRun,
  onComplete,
  variant = "primary",
}: DiscoveryRunButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  function handleRun() {
    setMessage(null);
    startTransition(async () => {
      const result = await onRun();
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Discovery completed" });
        onComplete?.();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant={variant}
        onPress={handleRun}
        isDisabled={isPending}
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Scanning..." : label}
      </Button>
      {message && (
        <p
          className={`text-xs ${message.type === "error" ? "text-red-400" : "text-green-400"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
