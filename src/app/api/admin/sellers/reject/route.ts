import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 뷰티 전문가 입점 신청 거절: 승인 대기(미승인) 상태의 뷰티 전문가 계정을 삭제한다.
// 미승인 뷰티 전문가는 로그인이 차단되어 뷰티 서비스/캠페인/예약을 만들 수 없으므로 안전하게 삭제 가능.
// (User 삭제 시 SellerProfile 은 onDelete: Cascade 로 함께 삭제됨)
export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { sellerId } = await request.json();
  if (!sellerId) {
    return NextResponse.json({ error: "뷰티 전문가 ID가 필요합니다." }, { status: 400 });
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: {
      userId: true,
      isApproved: true,
      _count: { select: { shopProducts: true, campaigns: true, reservations: true } },
    },
  });

  if (!seller) {
    return NextResponse.json({ error: "뷰티 전문가를 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 승인된 뷰티 전문가는 거절(삭제) 불가 — 활동 데이터가 있을 수 있으므로 보호.
  if (seller.isApproved) {
    return NextResponse.json(
      { error: "이미 승인된 뷰티 전문가는 거절할 수 없습니다. 회원 관리에서 처리해주세요." },
      { status: 400 },
    );
  }

  // 방어적 가드: 활동 데이터가 있으면 삭제하지 않음.
  if (seller._count.shopProducts > 0 || seller._count.campaigns > 0 || seller._count.reservations > 0) {
    return NextResponse.json(
      { error: "활동 이력이 있는 뷰티 전문가는 거절(삭제)할 수 없습니다." },
      { status: 400 },
    );
  }

  try {
    // User 삭제 → SellerProfile 은 Cascade 로 함께 삭제.
    await prisma.user.delete({ where: { id: seller.userId } });
  } catch (e) {
    console.error("Seller reject error:", e);
    return NextResponse.json({ error: "거절 처리에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
