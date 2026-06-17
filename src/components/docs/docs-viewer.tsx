"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { FileText, BookOpen } from "lucide-react";
import type { DocEntry } from "@/lib/docs/service";
import { DocsMarkdown } from "./docs-markdown";

interface DocsViewerProps {
  docs: DocEntry[];
  activeSlug: string;
  content: string;
  activeTitle: string;
}

export function DocsViewer({
  docs,
  activeSlug,
  content,
  activeTitle,
}: DocsViewerProps) {
  const rootDocs = docs.filter((d) => d.group === "root");
  const folderDocs = docs.filter((d) => d.group === "docs");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <Card className="acdm-card w-full shrink-0 lg:w-64 lg:sticky lg:top-6">
        <Card.Header>
          <Card.Title className="acdm-card-title flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Documents
          </Card.Title>
          <Card.Description>{docs.length} markdown files</Card.Description>
        </Card.Header>
        <Card.Content className="gap-4 p-0 pb-4">
          {rootDocs.length > 0 && (
            <div>
              <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Project root
              </p>
              <nav className="space-y-0.5 px-2">
                {rootDocs.map((doc) => (
                  <DocNavLink
                    key={doc.slug}
                    doc={doc}
                    active={activeSlug === doc.slug}
                  />
                ))}
              </nav>
            </div>
          )}
          {folderDocs.length > 0 && (
            <div>
              <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
                docs/
              </p>
              <nav className="max-h-[50vh] space-y-0.5 overflow-y-auto px-2">
                {folderDocs.map((doc) => (
                  <DocNavLink
                    key={doc.slug}
                    doc={doc}
                    active={activeSlug === doc.slug}
                  />
                ))}
              </nav>
            </div>
          )}
        </Card.Content>
      </Card>

      <Card className="acdm-card min-w-0 flex-1">
        <Card.Header>
          <Card.Title className="acdm-card-title flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" />
            {activeTitle}
          </Card.Title>
          <Card.Description className="font-mono text-xs">
            {docs.find((d) => d.slug === activeSlug)?.group === "root"
              ? "README.md"
              : `docs/${docs.find((d) => d.slug === activeSlug)?.filename}`}
          </Card.Description>
        </Card.Header>
        <Card.Content className="pt-2">
          <DocsMarkdown content={content} />
        </Card.Content>
      </Card>
    </div>
  );
}

function DocNavLink({ doc, active }: { doc: DocEntry; active: boolean }) {
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-blue-600/15 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      }`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="truncate">{doc.title}</span>
    </Link>
  );
}
