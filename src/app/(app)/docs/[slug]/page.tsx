import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { DocsViewer } from "@/components/docs/docs-viewer";
import {
  getDocumentationBySlug,
  listDocumentation,
} from "@/lib/docs/service";

export const dynamic = "force-dynamic";

interface DocsSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DocsSlugPage({ params }: DocsSlugPageProps) {
  await getSession();
  const { slug } = await params;

  let content: string;
  let entry;

  try {
    const result = await getDocumentationBySlug(slug);
    content = result.content;
    entry = result.entry;
  } catch {
    notFound();
  }

  const docs = await listDocumentation();

  return (
    <div className="p-6">
      <PageHeader
        title="Documentation"
        description="Platform guides, architecture notes, and operational references"
      />
      <DocsViewer
        docs={docs}
        activeSlug={slug}
        content={content}
        activeTitle={entry.title}
      />
    </div>
  );
}
