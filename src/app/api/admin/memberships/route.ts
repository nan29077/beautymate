import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeQuery, isMissingSchemaError } from "@/lib/safeDb";
import { ensureShopMembership } from "@/lib/shopMembership";

export const dynamic = "force-dynamic";

// GET /api/admin/memberships — 전체 점집 회원 조회 (관리자 전용)
// query: shopId, search(이름/이메일/전화), page, limit
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const url = new URL(request.url);
  const shopId = url.searchParams.get("shopId");
  const search = url.searchParams.get("search")?.trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));

  const where = {
    ...(shopId ? { shopId } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await safeQuery("admin memberships list", () =>
    Promise.all([
      prisma.shopMembership.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          shop: { select: { id: true, shopName: true, slug: true } },
        },
        orderBy: { joinedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shopMembership.count({ where }),
    ]), [[], 0]);

  const shops = await prisma.sellerProfile.findMany({
    where: { isApproved: true },
    select: { id: true, shopName: true, slug: true },
    orderBy: { shopName: "asc" },
  });

  return NextResponse.json({
    memberships: rows.map((m) => ({
      id: m.id,
      joinedAt: m.joinedAt,
      user: m.user,
      shop: m.shop,
    })),
    shops,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/admin/memberships — 관리자가 고객을 점집 회원으로 등록
// body: { userId, shopId }
export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { userId, shopId } = await request.json();
  if (!userId || !shopId) {
    return NextResponse.json({ error: "userId와 shopId가 필요합니다." }, { status: 400 });
  }

  const [user, shop] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.sellerProfile.findUnique({ where: { id: shopId }, select: { id: true, userId: true } }),
  ]);
  if (!user || !shop) {
    return NextResponse.json({ error: "고객 또는 점집을 찾을 수 없습니다." }, { status: 404 });
  }

  const membership = await ensureShopMembership(shop.id, userId, shop.userId);
  if (!membership) {
    return NextResponse.json(
      { error: "점집 회원 기능이 아직 준비 중입니다. (DB 스키마 미반영)" },
      { status: 503 },
    );
  }
  return NextResponse.json({ success: true, membership: { id: membership.id } });
}

// DELETE /api/admin/memberships?id= — 멤버십 해제 (관리자 전용)
export async function DELETE(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  try {
    await prisma.shopMembership.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return NextResponse.json(
        { error: "점집 회원 기능이 아직 준비 중입니다." },
        { status: 503 },
      );
    }
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "멤버십을 찾을 수 없습니다." }, { status: 404 });
    }
    throw e;
  }
}
