import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  pdf: "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;

  // 경로 탐색 공격 방지
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const filePath = join(process.cwd(), "public", "uploads", filename);

  if (!existsSync(filePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
