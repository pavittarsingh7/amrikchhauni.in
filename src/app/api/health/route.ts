import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", service: "acdm" });
  } catch {
    return NextResponse.json(
      { status: "error", service: "acdm" },
      { status: 503 }
    );
  }
}
