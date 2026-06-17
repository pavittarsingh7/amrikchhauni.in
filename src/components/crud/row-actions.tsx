"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@heroui/react";

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}

export function RowActions({ onEdit, onDelete, readOnly }: RowActionsProps) {
  if (readOnly) return null;

  return (
    <div className="flex gap-1">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={onEdit}
        aria-label="Edit"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={onDelete}
        className="text-red-400 hover:text-red-300"
        aria-label="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
