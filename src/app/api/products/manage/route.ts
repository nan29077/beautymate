import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Manage product actions (hide, show, delete)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const role = session.user.role;
    if (!["SUPER_ADMIN", "CONSULTANT"].includes(role)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const { productId, action, shopProductId } = await req.json();
    if (!productId || !action) {
      return NextResponse.json({ error: "productId와 action은 필수입니다" }, { status: 400 });
    }

    // 판매 시작/중지/일시중지 (뷰티 전문가 뷰티샵 뷰티 서비스 단위)
    if (action === "startSale" || action === "stopSale" || action === "pauseSale") {
      const newActive = action === "startSale";
      if (shopProductId) {
        // 소유권 검사 — 뷰티 전문가는 본인 뷰티샵의 뷰티 서비스만 판매 상태 변경 가능 (IDOR 방지)
        if (role === "CONSULTANT") {
          const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user!.id } });
          const shopProduct = await prisma.sellerShopProduct.findUnique({
            where: { id: shopProductId },
            select: { sellerId: true },
          });
          if (!seller || !shopProduct || shopProduct.sellerId !== seller.id) {
            return NextResponse.json({ error: "본인 뷰티샵의 뷰티 서비스만 변경할 수 있습니다" }, { status: 403 });
          }
        }
        // 승인 시 isApproved도 함께 설정
        const updateData: any = { isActive: newActive };
        if (action === "startSale") {
          updateData.isApproved = true;
        }
        await prisma.sellerShopProduct.update({
          where: { id: shopProductId },
          data: updateData,
        });
      } else {
        if (role === "CONSULTANT") {
          const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user!.id } });
          if (seller) {
            const updateData: any = { isActive: newActive };
            if (action === "startSale") {
              updateData.isApproved = true;
            }
            await prisma.sellerShopProduct.updateMany({
              where: { sellerId: seller.id, productId },
              data: updateData,
            });
          }
        } else {
          await prisma.product.update({
            where: { id: productId },
            data: { isActive: newActive },
          });
        }
      }
      const msgs: Record<string, string> = {
        startSale: "판매가 재시작되었습니다",
        stopSale: "판매가 중지되었습니다",
        pauseSale: "판매가 일시중지되었습니다",
      };
      return NextResponse.json({ success: true, message: msgs[action] || "처리되었습니다" });
    }

    // Verify the product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {},
    });
    if (!product) {
      return NextResponse.json({ error: "뷰티 서비스를 찾을 수 없습니다" }, { status: 404 });
    }

    // Check permissions
    // hide/show/delete 는 마스터 상품 자체를 바꾸는 전역 조작 — 뷰티 전문가는 "본인이 등록한" 상품만 가능.
    // (기존에는 뷰티샵에 담기만 해도 통과되어 타인 등록 상품을 전역 숨김/삭제할 수 있었다)
    if (role === "CONSULTANT") {
      const seller = await prisma.sellerProfile.findUnique({
        where: { userId: session.user!.id },
      });
      if (!seller) {
        return NextResponse.json({ error: "뷰티 전문가 프로필이 없습니다" }, { status: 403 });
      }
      if (product.sellerId !== seller.id) {
        return NextResponse.json({ error: "본인이 등록한 뷰티 서비스만 변경할 수 있습니다" }, { status: 403 });
      }
    }

    switch (action) {
      case "hide":
        await prisma.product.update({
          where: { id: productId },
          data: { isActive: false },
        });
        return NextResponse.json({ success: true, message: "뷰티 서비스가 숨겨졌습니다" });

      case "show":
        await prisma.product.update({
          where: { id: productId },
          data: { isActive: true },
        });
        return NextResponse.json({ success: true, message: "뷰티 서비스가 공개되었습니다" });

      case "enableGroupBuy":
        if (!["SUPER_ADMIN"].includes(role)) {
          return NextResponse.json({ error: "관리자/브랜드만 설정 가능합니다" }, { status: 403 });
        }
        await prisma.product.update({
          where: { id: productId },
          data: { allowGroupBuy: true },
        });
        return NextResponse.json({ success: true, message: "공동 프로모션 뷰티 서비스으로 등록되었습니다" });

      case "disableGroupBuy":
        if (!["SUPER_ADMIN"].includes(role)) {
          return NextResponse.json({ error: "관리자/브랜드만 설정 가능합니다" }, { status: 403 });
        }
        await prisma.product.update({
          where: { id: productId },
          data: { allowGroupBuy: false },
        });
        return NextResponse.json({ success: true, message: "공동 프로모션 뷰티 서비스에서 제외되었습니다" });

      case "enableLiveCommerce":
        if (!["SUPER_ADMIN"].includes(role)) {
          return NextResponse.json({ error: "관리자/브랜드만 설정 가능합니다" }, { status: 403 });
        }
        await prisma.product.update({
          where: { id: productId },
          data: { allowLiveCommerce: true },
        });
        return NextResponse.json({ success: true, message: "라이브 뷰티 뷰티 서비스으로 등록되었습니다" });

      case "disableLiveCommerce":
        if (!["SUPER_ADMIN"].includes(role)) {
          return NextResponse.json({ error: "관리자/브랜드만 설정 가능합니다" }, { status: 403 });
        }
        await prisma.product.update({
          where: { id: productId },
          data: { allowLiveCommerce: false },
        });
        return NextResponse.json({ success: true, message: "라이브 뷰티 뷰티 서비스에서 제외되었습니다" });

      case "delete":
        // Delete related records first
        await prisma.$transaction([
          prisma.shoppingTag.deleteMany({ where: { productId } }),
          prisma.cartItem.deleteMany({ where: { productId } }),
          prisma.wishlist.deleteMany({ where: { productId } }),
          prisma.productImage.deleteMany({ where: { productId } }),
          prisma.productVariant.deleteMany({ where: { productId } }),
          prisma.sellerShopProduct.deleteMany({ where: { productId } }),
          prisma.groupBuyCampaign.deleteMany({ where: { productId } }),
          prisma.review.deleteMany({ where: { productId } }),
          prisma.reservationItem.deleteMany({ where: { productId } }),
          prisma.product.delete({ where: { id: productId } }),
        ]);
        return NextResponse.json({ success: true, message: "뷰티 서비스가 삭제되었습니다" });

      default:
        return NextResponse.json({ error: "잘못된 action입니다" }, { status: 400 });
    }
  } catch (error) {
    console.error("Product manage error:", error);
    return NextResponse.json({ error: "작업 실패" }, { status: 500 });
  }
}
