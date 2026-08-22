import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveApprover } from "@/lib/productApprover";

// POST: 승인 주체(브랜드사 / 중간관리자 / 최고관리자)가 뷰티 전문가 뷰티 서비스 신청을 승인/반려한다.
// body: { shopProductId: string, action: "approve" | "reject" }
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const role = session.user.role;
    if (!["SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const { shopProductId, action, rejectionReason } = await req.json();
    if (!shopProductId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
    }

    const shopProduct = await prisma.sellerShopProduct.findUnique({
      where: { id: shopProductId },
      include: { product: { select: { id: true, sellerId: true } } },
    });
    if (!shopProduct || !shopProduct.product) {
      return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
    }

    // 승인 주체는 2자 구조에서 언제나 최고관리자
    const { approverType } = resolveApprover();

    const authorized = role === "SUPER_ADMIN" && approverType === "SUPER_ADMIN";
    if (!authorized) {
      return NextResponse.json({ error: "이 신청에 대한 승인 권한이 없습니다" }, { status: 403 });
    }

    if (action === "approve") {
      await prisma.sellerShopProduct.update({
        where: { id: shopProductId },
        data: { isApproved: true, isActive: true, rejectionReason: null },
      });
      return NextResponse.json({ success: true, message: "뷰티 전문가 뷰티 서비스 신청을 승인했습니다" });
    }

    // reject → 삭제하지 않고 반려 상태로 표시 (뷰티 전문가가 사유를 확인할 수 있도록 유지)
    const reason = typeof rejectionReason === "string" ? rejectionReason.trim().slice(0, 500) : "";
    await prisma.sellerShopProduct.update({
      where: { id: shopProductId },
      data: {
        isApproved: false,
        isActive: false,
        rejectionReason: reason || "사유 미입력",
      },
    });
    return NextResponse.json({ success: true, message: "뷰티 전문가 뷰티 서비스 신청을 반려했습니다" });
  } catch (e) {
    console.error("seller-products review error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
