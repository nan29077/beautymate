import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 비로그인 공개 화면(상품 상세 정책 탭·점집 푸터·파비콘 등)에서 읽는 공개 키 목록.
// 이 외의 키는 SUPER_ADMIN 만 조회할 수 있다 (설정 테이블 임의 키 노출 방지).
const PUBLIC_KEYS = new Set([
  "refundPolicy",
  "shippingPolicy",
  "usagePolicy",
  "enableSnsLive",
  "site.faviconUrl",
]);

// GET /api/admin/site-config?key=xxx  또는  GET /api/admin/site-config (전체)
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (key) {
    // 공개 키가 아니면 SUPER_ADMIN 인증 필수
    if (!PUBLIC_KEYS.has(key)) {
      const session = await auth();
      if ((session?.user as any)?.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "권한 없음" }, { status: 403 });
      }
    }
    const row = await prisma.setting.findUnique({ where: { key } });
    return NextResponse.json({ value: row?.value ?? null });
  }

  // 전체 정책 키 목록
  const keys = ["refundPolicy", "shippingPolicy", "usagePolicy"];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  return NextResponse.json(result);
}

// PUT /api/admin/site-config  { key, value }
export async function PUT(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { key, value } = await req.json();
  if (!key || typeof value !== "string") {
    return NextResponse.json({ error: "key, value 필수" }, { status: 400 });
  }

  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  return NextResponse.json({ ok: true });
}
