import { DM_Sans, Instrument_Sans } from "next/font/google";
import type { Metadata } from "next";
import "../hub.css";
import { HubThemeInit } from "@/components/hub/hub-theme";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "amrikchhauni.in — Project Hub",
  description:
    "Development and demo hub for projects hosted on amrikchhauni.in subdomains.",
};

export default function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=localStorage.getItem('hub-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&d))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`,
        }}
      />
      <div
        className={`${dmSans.variable} ${instrumentSans.variable} min-h-screen bg-slate-50 font-sans text-slate-800 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100`}
        style={{ fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui" }}
      >
      <HubThemeInit />
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/20" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-900/15" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/25 blur-3xl dark:bg-sky-900/10" />
      </div>
      <div className="relative mx-auto flex min-h-screen flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {children}
      </div>
      </div>
    </>
  );
}
