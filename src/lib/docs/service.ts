import fs from "fs/promises";
import path from "path";

export type DocEntry = {
  slug: string;
  title: string;
  filename: string;
  group: "root" | "docs";
};

function filenameToSlug(filename: string): string {
  return filename.replace(/\.md$/i, "").toLowerCase();
}

function formatTitle(filename: string): string {
  return filename
    .replace(/\.md$/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveDocPath(entry: DocEntry): string {
  if (entry.group === "root") {
    return path.join(process.cwd(), entry.filename);
  }
  return path.join(process.cwd(), "docs", entry.filename);
}

export async function listDocumentation(): Promise<DocEntry[]> {
  const docsDir = path.join(process.cwd(), "docs");
  const files = (await fs.readdir(docsDir))
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  return [
    {
      slug: "readme",
      title: "README",
      filename: "README.md",
      group: "root",
    },
    ...files.map((filename) => ({
      slug: filenameToSlug(filename),
      title: formatTitle(filename),
      filename,
      group: "docs" as const,
    })),
  ];
}

export async function getDocumentationBySlug(slug: string): Promise<{
  entry: DocEntry;
  content: string;
}> {
  const entries = await listDocumentation();
  const entry = entries.find((e) => e.slug === slug);

  if (!entry) {
    throw new Error("Document not found");
  }

  const filepath = resolveDocPath(entry);
  const content = await fs.readFile(filepath, "utf-8");

  return { entry, content };
}
