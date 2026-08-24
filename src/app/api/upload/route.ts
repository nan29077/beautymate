import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { existsSync } from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Next.js 프로젝트 루트 탐색 (pm2 cwd가 달라도 안전하게 동작)
function getNextJsRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (
      existsSync(join(dir, "next.config.js")) ||
      existsSync(join(dir, "next.config.ts")) ||
      existsSync(join(dir, "next.config.mjs"))
    ) {
      return dir;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// CRITICAL: Increase body size limit for file uploads
// Next.js 14 App Router default is ~4MB, we need 25MB for large images
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Explicitly increase body parser size for this API route
export const maxDuration = 60; // seconds

// ── 업로드 보안 정책 ─────────────────────────────────────────────
// 업로드된 파일은 그대로 공개 URL(S3/CloudFront 또는 /uploads)로 서빙되므로,
// 스크립트를 실행할 수 있는 형식(SVG/HTML)을 받으면 저장형 XSS 가 된다.
// 따라서 (1) 매직바이트로 판별된 실제 형식이 화이트리스트에 있어야 하고,
// (2) SVG 는 판별 결과·확장자·MIME 어느 경로로도 통과시키지 않으며,
// (3) 파일당 최대 크기를 강제한다.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "tif",
  "avif",
  "heic",
  "heif",
  "ico", // 파비콘 업로드
]);
// 명시적으로 거부하는 형식 (실행 가능 마크업 / 실행 파일)
const BLOCKED_EXTS = new Set([
  "svg",
  "svgz",
  "html",
  "htm",
  "xhtml",
  "xml",
  "js",
  "mjs",
  "php",
  "exe",
  "sh",
  "bat",
]);
// 업로드가 허용된 역할 — 업로더 UI 는 관리자/뷰티 전문가 화면에만 존재한다.
// (레거시 역할 계정도 기존 대시보드를 쓰고 있으므로 함께 허용)
const UPLOAD_ALLOWED_ROLES = new Set([
  "SUPER_ADMIN",
  "CONSULTANT",
  "SELLER",
  "BRAND_ADMIN",
  "MIDDLE_ADMIN",
]);

// Detect image type from file header (magic bytes)
function detectImageFromBytes(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "jpg";
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return "png";
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return "gif";
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return "webp";
  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return "bmp";
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
      (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)) return "tiff";
  // HEIF/HEIC/AVIF: ftyp box at offset 4
  if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.slice(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return "avif";
    return "heic";
  }
  // SVG: starts with < (XML-like)
  if (buffer[0] === 0x3C) {
    const head = buffer.slice(0, Math.min(256, buffer.length)).toString('utf8').toLowerCase();
    if (head.includes('<svg')) return "svg";
  }
  // PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return "pdf";
  
  return null;
}

// Fallback: guess extension from file name or MIME type.
// 화이트리스트에 없는 확장자는 채택하지 않는다 (null → 업로드 거부).
function guessExtension(fileName: string, mimeType: string): string | null {
  const nameExt = (fileName || "").split(".").pop()?.toLowerCase() || "";
  if (BLOCKED_EXTS.has(nameExt)) return null;
  if (ALLOWED_EXTS.has(nameExt)) return nameExt === "jpeg" ? "jpg" : nameExt;
  if (mimeType) {
    const mimeExt = mimeType.split("/").pop()?.toLowerCase() || "";
    if (BLOCKED_EXTS.has(mimeExt) || mimeExt.includes("svg")) return null;
    if (mimeExt === "jpeg") return "jpg";
    if (ALLOWED_EXTS.has(mimeExt)) return mimeExt;
  }
  return null;
}

// S3 설정 (환경변수가 있을 때만 활성화)
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_S3_REGION || "ap-northeast-2";
const S3_PREFIX = process.env.AWS_S3_PREFIX || "uploads";
const S3_PUBLIC_URL = process.env.AWS_S3_PUBLIC_URL; // 예: https://d1234.cloudfront.net 또는 https://bucket.s3.region.amazonaws.com

const s3Client = S3_BUCKET
  ? new S3Client({
      region: S3_REGION,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined, // EC2 인스턴스 역할(IAM Role)로도 자동 인증됨
    })
  : null;

async function uploadToS3(buffer: Buffer, uniqueName: string, mimeType: string): Promise<string> {
  const key = `${S3_PREFIX}/${uniqueName}`;
  await s3Client!.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  // 커스텀 퍼블릭 URL (CloudFront 등) > S3 기본 URL
  if (S3_PUBLIC_URL) return `${S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }
    // 고객(CUSTOMER/BUYER)은 업로드 UI 가 없다 — 공개 저장소에 임의 파일을 올리지 못하게 막는다.
    const role = (session.user as any)?.role as string | undefined;
    if (!role || !UPLOAD_ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "업로드 권한이 없습니다." }, { status: 403 });
    }

    let files: File[] = [];

    // Try to parse FormData with multiple strategies
    try {
      const formData = await req.formData();

      // Try "files" first, then "file" as fallback key
      files = formData.getAll("files") as File[];
      if (files.length === 0) {
        files = formData.getAll("file") as File[];
      }
      // Also try to collect any File entries in formData
      if (files.length === 0) {
        for (const [key, value] of formData.entries()) {
          if (value instanceof File && value.size > 0) {
            files.push(value);
          }
        }
      }
    } catch (parseError: any) {
      console.error("[Upload] FormData parsing FAILED:", parseError?.message || parseError);
      console.error("[Upload] This is likely a body size limit issue or malformed request");
      
      return NextResponse.json({ 
        error: "파일 전송 오류가 발생했습니다. 파일 크기를 줄이거나 한 장씩 업로드해 주세요.",
        debug: parseError?.message 
      }, { status: 400 });
    }

    // Filter out any invalid File objects (size 0 or non-File)
    files = files.filter(f => f instanceof File && f.size > 0);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "파일이 없습니다. 사진을 선택해 주세요." }, { status: 400 });
    }

    // S3 미설정 시 로컬 파일시스템 fallback (개발 환경용)
    const useS3 = !!s3Client;
    let uploadDir = "";
    if (!useS3) {
      uploadDir = join(getNextJsRoot(), "public", "uploads");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
    }

    const urls: string[] = [];
    const errors: string[] = [];
    const processedNames = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Skip duplicate files
      const fileKey = `${file.name}-${file.size}`;
      if (processedNames.has(fileKey)) continue;
      processedNames.add(fileKey);

      // 크기 상한 — 버퍼로 읽기 전에 선차단한다.
      if (file.size > MAX_IMAGE_BYTES) {
        errors.push(`${file.name}: 파일이 너무 큽니다 (최대 10MB)`);
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const actualSize = buffer.length;

        if (actualSize === 0) {
          errors.push(`${file.name}: 빈 파일`);
          continue;
        }
        if (actualSize > MAX_IMAGE_BYTES) {
          errors.push(`${file.name}: 파일이 너무 큽니다 (최대 10MB)`);
          continue;
        }

        // Detect image type from magic bytes (primary method)
        const detected = detectImageFromBytes(buffer);
        // SVG 는 스크립트 실행이 가능한 마크업이라 저장형 XSS 벡터다 — 무조건 거부.
        if (detected === "svg") {
          errors.push(`${file.name}: SVG 파일은 업로드할 수 없습니다`);
          continue;
        }
        const ext = detected ?? guessExtension(file.name, file.type);
        if (!ext || !ALLOWED_EXTS.has(ext)) {
          errors.push(`${file.name}: 지원하지 않는 형식입니다 (이미지 파일만 업로드 가능)`);
          continue;
        }

        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        if (useS3) {
          // ✅ S3 업로드 (영구 저장 — 배포 재시작 시 소실 없음)
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
            gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
            tiff: "image/tiff", tif: "image/tiff",
            avif: "image/avif", heic: "image/heic", heif: "image/heif",
            ico: "image/x-icon",
          };
          // Content-Type 도 화이트리스트에서만 고른다 (file.type 을 그대로 신뢰하면
          // image/svg+xml 같은 값이 그대로 응답 헤더에 실린다).
          const contentType = mimeMap[ext] || "application/octet-stream";
          const url = await uploadToS3(buffer, uniqueName, contentType);
          urls.push(url);
        } else {
          // fallback: 로컬 파일시스템 (개발 전용)
          const filePath = join(uploadDir, uniqueName);
          await writeFile(filePath, buffer);
          urls.push(`/uploads/${uniqueName}`);
        }
      } catch (fileErr: any) {
        console.error(`[Upload] Error processing ${file.name}:`, fileErr?.message || fileErr);
        errors.push(`${file.name}: 처리 실패`);
      }
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "이미지를 저장할 수 없습니다. 다시 시도해 주세요.", errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ urls, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) {
    console.error("[Upload] Unexpected error:", error?.message || error);
    return NextResponse.json({ error: "업로드 실패. 다시 시도해 주세요." }, { status: 500 });
  }
}
