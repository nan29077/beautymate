import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 뷰티 전문가 화면: 뷰티 서비스명 포맷 변환
// - 중간관리자 뷰티 서비스: "(브랜드명 + 중간관리자이름)" → "(중간관리자이름)"
// - 브랜드 직접 등록 뷰티 서비스: "(브랜드명 + 중간관리자이름)" → "(브랜드명)" / 그대로 유지
// 뷰티 전문가 노출 공급가 = 공급가 + 관리자 마진 (공급가 없으면 판매가로 폴백)
function effectiveSupply(p: { supplyPrice: any; basePrice: any; adminMargin?: any }): number {
  const supply = p.supplyPrice != null ? Number(p.supplyPrice) : Number(p.basePrice);
  const adminMargin = p.adminMargin != null ? Number(p.adminMargin) : 0;
  return supply + adminMargin;
}

// GET: 뷰티 전문가가 사용할 수 있는 뷰티 서비스 목록
// ?type=groupbuy → 공동 프로모션용 (allowGroupBuy=true인 뷰티 서비스 + 내 뷰티 서비스)
// ?type=live     → 라이브 뷰티용 (allowLiveCommerce=true인 뷰티 서비스 + 내 뷰티 서비스)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const role = session.user.role;
    if (role !== "CONSULTANT") {
      return NextResponse.json({ error: "뷰티 전문가 전용" }, { status: 403 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: session.user!.id },
    });

    if (!seller) {
      return NextResponse.json({ error: "뷰티 전문가 프로필이 없습니다" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "groupbuy"; // "groupbuy" | "live"

    // 1. 뷰티 전문가 자신의 뷰티 서비스 (항상 표시)
    const shopProducts = await prisma.sellerShopProduct.findMany({
      where: { sellerId: seller.id, isActive: true },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
          },
        },
      },
    });

    const shopProductIds = new Set(shopProducts.map((sp) => sp.productId));

    // 2. 브랜드/관리자가 해당 유형으로 등록한 뷰티 서비스
    const typeFilter = type === "live"
      ? { allowLiveCommerce: true }
      : { allowGroupBuy: true };

    const registeredProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isApproved: true,
        ...typeFilter,
        id: { notIn: Array.from(shopProductIds) }, // 내 뷰티 서비스 제외 (중복 방지)
      },
      include: {
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 결합: 내 뷰티 서비스 먼저, 그 다음 등록된 뷰티 서비스
    const products = [
      ...shopProducts.map((sp) => ({
        id: sp.product.id,
        name: sp.product.name,
        thumbnail: sp.product.thumbnail,
        basePrice: Number(sp.product.basePrice),
        supplyPrice: effectiveSupply(sp.product),
        categoryName: sp.product.category?.name || null,
        allowGroupBuy: sp.product.allowGroupBuy,
        allowLiveCommerce: (sp.product as any).allowLiveCommerce ?? false,
        isInShop: true,
        isOwn: true,
      })),
      ...registeredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        thumbnail: p.thumbnail,
        basePrice: Number(p.basePrice),
        supplyPrice: effectiveSupply(p),
        categoryName: p.category?.name || null,
        allowGroupBuy: p.allowGroupBuy,
        allowLiveCommerce: (p as any).allowLiveCommerce ?? false,
        isInShop: false,
        isOwn: false,
      })),
    ];

    return NextResponse.json({ products, type });
  } catch (error) {
    console.error("Available products error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
