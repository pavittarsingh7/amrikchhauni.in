"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocsMarkdownProps {
  content: string;
}

export function DocsMarkdown({ content }: DocsMarkdownProps) {
  return (
    <div className="docs-markdown max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        h1: ({ children }) => (
          <h1 className="mb-6 mt-2 text-2xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-4 mt-8 text-xl font-semibold text-slate-900 dark:text-white">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-3 mt-6 text-lg font-semibold text-slate-800 dark:text-slate-200">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 ml-6 list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 ml-6 list-decimal space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-4 border-l-4 border-slate-300 pl-4 italic text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className={`block overflow-x-auto rounded-lg bg-slate-100 p-4 text-xs font-mono text-slate-800 dark:bg-slate-950 dark:text-slate-200 ${className ?? ""}`}>
                {children}
              </code>
            );
          }
          return (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-indigo-700 dark:bg-slate-800 dark:text-indigo-300">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-950">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-100 dark:bg-slate-900/80">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-slate-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:text-slate-400">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-slate-200/80 px-4 py-2 text-slate-700 dark:border-slate-800/50 dark:text-slate-300">
            {children}
          </td>
        ),
        hr: () => (
          <hr className="my-8 border-slate-200 dark:border-slate-800" />
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900 dark:text-white">
            {children}
          </strong>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
