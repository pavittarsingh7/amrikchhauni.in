"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Loader2 } from "lucide-react";

interface ActionButtonProps {
  label: string;
  onAction: () => Promise<{ error?: string; output?: string }>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
}

export function ActionButton({
  label,
  onAction,
  variant = "secondary",
  disabled,
  className,
}: ActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handlePress() {
    setMessage(null);
    startTransition(async () => {
      const result = await onAction();
      if (result.error) setMessage(result.error);
      else if (result.output) setMessage(result.output);
    });
  }

  return (
    <div className={className}>
      <Button
        variant={variant}
        size="sm"
        onPress={handlePress}
        isDisabled={disabled || isPending}
        className="gap-1"
      >
        {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
        {label}
      </Button>
      {message && (
        <p className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={message}>
          {message}
        </p>
      )}
    </div>
  );
}
