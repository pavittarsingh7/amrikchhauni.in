import { NextResponse } from "next/server";
import fs from "fs/promises";
import { getSession } from "@/lib/auth/session";
import { getBackupForDownload } from "@/lib/backups/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const backup = await getBackupForDownload(id);
    const content = await fs.readFile(backup.filepath);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Not found" },
      { status: 404 }
    );
  }
}
