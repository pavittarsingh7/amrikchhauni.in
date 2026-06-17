"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <Button
      type="button"
      variant="secondary"
      isIconOnly
      aria-label="Toggle dark mode"
      className={className}
      onPress={toggleTheme}
      isDisabled={!mounted}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
