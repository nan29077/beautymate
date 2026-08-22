import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/customers — 전체 고객의 귀속 뷰티 전문가 조회 (관리자 전용)
// query: search(이름/이메일/전화), sellerId(귀속 뷰티 전문가 필터, "none"=미귀속), page, limit
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const sellerId = url.searchParams.get("sellerId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));

  // 레거시 role(BUYER)도 고객으로 취급한다
  const and: Record<string, unknown>[] = [];
  if (search) {
    and.push({
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ],
    });
  }
  if (sellerId === "none") {
    and.push({
      OR: [{ buyerProfile: null }, { buyerProfile: { referredBySellerId: null } }],
    });
  } else if (sellerId) {
    and.push({ buyerProfile: { referredBySellerId: sellerId } });
  }
  const where: Record<string, unknown> = {
    role: { in: ["CUSTOMER", "BUYER"] },
    ...(and.length ? { AND: and } : {}),
  };

  const [users, total, sellers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        buyerProfile: {
          select: {
            id: true,
            referredBySellerId: true,
            referredBySeller: { select: { id: true, shopName: true, slug: true } },
            primarySellerId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.sellerProfile.findMany({
      where: { isApproved: true },
      select: { id: true, shopName: true, slug: true },
      orderBy: { shopName: "asc" },
    }),
  ]);

  return NextResponse.json({
    customers: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      referredBySeller: u.buyerProfile?.referredBySeller ?? null,
    })),
    sellers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// PATCH /api/admin/customers — 고객의 귀속 뷰티 전문가 변경 (관리자 전용)
// body: { userId, sellerId: string | null } — null 이면 귀속 해제
export async function PATCH(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { userId, sellerId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "고객을 찾을 수 없습니다." }, { status: 404 });
  }

  if (sellerId) {
    const seller = await prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });
    if (!seller) {
      return NextResponse.json({ error: "뷰티 전문가를 찾을 수 없습니다." }, { status: 404 });
    }
  }

  const profile = await prisma.buyerProfile.upsert({
    where: { userId },
    update: { referredBySellerId: sellerId ?? null },
    create: { userId, referredBySellerId: sellerId ?? null },
    select: {
      referredBySeller: { select: { id: true, shopName: true, slug: true } },
    },
  });

  return NextResponse.json({
    success: true,
    referredBySeller: profile.referredBySeller,
  });
}
