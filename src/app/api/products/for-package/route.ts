import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 패키지 구성용 승인된 상담상품 목록
// 브랜드/관리자가 등록하고 승인된 상담상품만 반환 (카테고리·브랜드 필터 지원)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const role = (session.user as any).role as string;
  if (!["SUPER_ADMIN", "CONSULTANT"].includes(role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const brandId = searchParams.get("brandId");
  const search = searchParams.get("search");

  const where: any = {
    isApproved: true,
    isActive: true,
  };

  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.name = { contains: search };
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        thumbnail: true,
        basePrice: true,
        supplyPrice: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const brands: { id: string; brandName: string }[] = [];

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      supplyPrice: p.supplyPrice ? Number(p.supplyPrice) : null,
    })),
    categories,
    brands,
  });
}
