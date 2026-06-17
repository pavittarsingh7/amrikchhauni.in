"use client";

import { useEffect } from "react";

export function HubThemeInit() {
  useEffect(() => {
    const stored = localStorage.getItem("hub-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return null;
}

export function HubThemeToggle() {
  function toggle() {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "hub-theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-slate-600 shadow-sm backdrop-blur transition-all duration-300 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
      aria-label="Toggle dark mode"
    >
      <svg
        className="h-5 w-5 hidden dark:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>
      <svg
        className="h-5 w-5 block dark:hidden"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
        />
      </svg>
    </button>
  );
}
