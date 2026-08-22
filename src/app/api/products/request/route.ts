import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveApprover } from "@/lib/productApprover";

export const dynamic = "force-dynamic";

// 뷰티 서비스 신청 목록 페이지당 기본/최대 개수
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// GET: 뷰티 전문가가 신청할 수 있는 뷰티 서비스 목록 (서버 페이지네이션 + 검색/브랜드/제공방식 필터)
//
// 쿼리 파라미터
//   page       1-based 페이지 번호 (기본 1)
//   pageSize   페이지당 개수 (기본 20, 최대 100)
//   search     뷰티 서비스명 또는 브랜드명 부분 검색
//   brandId    브랜드 필터
//   priceModel ALL | SUPPLY | COMMISSION
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "CONSULTANT") {
      return NextResponse.json({ error: "뷰티 전문가만 접근 가능합니다" }, { status: 403 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: session.user!.id },
      select: { id: true },
    });
    if (!seller) {
      return NextResponse.json({ error: "뷰티 전문가 프로필을 찾을 수 없습니다" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const pageParam = Number.parseInt(searchParams.get("page") || "1", 10);
    const sizeParam = Number.parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10);
    const requestedPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize = Number.isFinite(sizeParam)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, sizeParam))
      : DEFAULT_PAGE_SIZE;
    const search = (searchParams.get("search") || "").trim();
    const brandId = (searchParams.get("brandId") || "").trim();
    const priceModel = searchParams.get("priceModel");

    // 이미 뷰티샵에 담겨 있거나 신청한 뷰티 서비스는 목록에서 제외
    const owned = await prisma.sellerShopProduct.findMany({
      where: { sellerId: seller.id },
      select: { productId: true },
    });
    const excludeIds = owned.map((o) => o.productId);

    // 신청 대상: 관리자/브랜드가 등록(sellerId=null)하고 승인된 활성 뷰티 서비스만.
    // 다른 뷰티 전문가가 직접 등록한 뷰티 서비스(sellerId != null)은 제외한다. (POST 검증과 동일 기준)
    const where: any = {
      isActive: true,
      isApproved: true,
      sellerId: null,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      ...(brandId ? { brandId } : {}),
      ...(priceModel === "SUPPLY" || priceModel === "COMMISSION" ? { priceModel } : {}),
      // MySQL 기본 collation이 대소문자를 무시하므로 mode 지정 없이 contains 사용
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { brandName: { contains: search } } },
            ],
          }
        : {}),
    };

    const total = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // 필터 변경 등으로 범위를 벗어난 페이지를 요청하면 마지막 페이지로 보정
    const page = Math.min(requestedPage, totalPages);

    const rows = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const products = rows.map((p) => {
      // 뷰티 전문가에게 노출할 공급가. 판매가는 뷰티 전문가가 직접 설정하며,
      // 이 공급가가 최소 판매가 기준이 된다. (공급가 미설정이면 판매가로 폴백)
      const supply = p.supplyPrice != null ? Number(p.supplyPrice) : Number(p.basePrice);
      return {
        id: p.id,
        name: p.name,
        thumbnail: p.thumbnail,
        basePrice: Number(p.basePrice),
        supplyPrice: supply,
        // 제공 방식: SUPPLY(공급가 제공) / COMMISSION(수수료 제공)
        priceModel: p.priceModel === "COMMISSION" ? "COMMISSION" : "SUPPLY",
        commissionRate: p.commissionRate != null ? Number(p.commissionRate) : null,
        categoryName: p.category?.name || null,
        consultingType: p.consultingType,
        consultingMethod: p.consultingMethod,
        durationMinutes: p.durationMinutes,
      };
    });

    return NextResponse.json({ products, total, page, pageSize, totalPages });
  } catch (error) {
    console.error("Available request products error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

// POST: Seller requests to add a product to their shop (requires admin approval)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "CONSULTANT") {
      return NextResponse.json({ error: "뷰티 전문가만 접근 가능합니다" }, { status: 403 });
    }

    const { productId, sellerPrice } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "뷰티 서비스 ID가 필요합니다" }, { status: 400 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: session.user!.id },
    });
    if (!seller) {
      return NextResponse.json({ error: "뷰티 전문가 프로필을 찾을 수 없습니다" }, { status: 404 });
    }

    // 신청 가능한 뷰티 서비스인지 검증: 관리자/브랜드 등록(sellerId=null) + 승인 + 활성 뷰티 서비스만.
    // 다른 뷰티 전문가가 직접 등록한 뷰티 서비스(sellerId != null)은 신청 불가.
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        isActive: true,
        isApproved: true,
        sellerId: true,
        priceModel: true,
      },
    });
    if (!product || !product.isActive || !product.isApproved || product.sellerId !== null) {
      return NextResponse.json({ error: "신청할 수 없는 뷰티 서비스입니다" }, { status: 400 });
    }

    // 뷰티 전문가 입력 판매가 파싱 (공급가 제공 뷰티 서비스에서만 유효). 수수료 제공 뷰티 서비스는 판매가 고정.
    let parsedSellerPrice: number | null = null;
    if (product.priceModel !== "COMMISSION" && sellerPrice != null && sellerPrice !== "") {
      const n = Number(sellerPrice);
      if (!isNaN(n) && n > 0) parsedSellerPrice = n;
    }

    // 승인 주체 판단 — 2자 구조에서는 언제나 최고관리자
    const { approverType, approverId } = resolveApprover();

    // Check if already added
    const existing = await prisma.sellerShopProduct.findUnique({
      where: {
        sellerId_productId: {
          sellerId: seller.id,
          productId,
        },
      },
    });
    if (existing) {
      // 이전에 반려된 신청이면 재신청 허용 (사유 초기화 후 대기 상태로 전환)
      if (existing.rejectionReason) {
        const reapplied = await prisma.sellerShopProduct.update({
          where: { id: existing.id },
          data: {
            isApproved: false,
            isActive: false,
            rejectionReason: null,
            sellerPrice: parsedSellerPrice,
            approverType,
            approverId,
          },
        });
        return NextResponse.json({ success: true, shopProduct: reapplied });
      }
      return NextResponse.json({ error: "이미 신청한 뷰티 서비스입니다." }, { status: 409 });
    }

    const shopProduct = await prisma.sellerShopProduct.create({
      data: {
        sellerId: seller.id,
        productId,
        isApproved: false,
        isActive: false,
        sellerPrice: parsedSellerPrice,
        approverType,
        approverId,
      },
    });

    return NextResponse.json({ success: true, shopProduct });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
