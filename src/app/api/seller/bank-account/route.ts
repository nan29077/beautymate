import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: 계좌 정보 조회
// - ?sellerId=xxx (SellerProfile.id) — 본인(해당 상담사) 또는 SUPER_ADMIN 만 조회 가능.
//   (기존에는 비로그인 공개 조회였으나 계좌 임의 수집 방지를 위해 차단.
//    소셜예약서 입금 계좌 표시는 POST /api/social-orders 응답으로 대체됨)
// - 파라미터가 없으면 로그인한 상담사 본인의 계좌 정보 조회 (설정 페이지용)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sellerId = searchParams.get("sellerId");

  if (sellerId) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    const role = (session.user as any).role;
    if (role !== "SUPER_ADMIN") {
      // 본인 점집(SellerProfile) 여부 확인
      const myProfile = await prisma.sellerProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!myProfile || myProfile.id !== sellerId) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }
    const seller = await prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: {
        user: { select: { bankName: true, bankAccount: true, bankHolder: true } },
      },
    });
    return NextResponse.json({
      bankName: seller?.user?.bankName ?? null,
      bankAccount: seller?.user?.bankAccount ?? null,
      bankHolder: seller?.user?.bankHolder ?? null,
    });
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bankName: true, bankAccount: true, bankHolder: true },
  });

  return NextResponse.json({
    bankName: user?.bankName ?? null,
    bankAccount: user?.bankAccount ?? null,
    bankHolder: user?.bankHolder ?? null,
  });
}

// PATCH: 로그인한 상담사 본인의 계좌 정보 수정
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { bankName, bankAccount, bankHolder } = body || {};

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        bankName: bankName?.trim() || null,
        bankAccount: bankAccount?.trim() || null,
        bankHolder: bankHolder?.trim() || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bank account update error:", error);
    return NextResponse.json({ error: "계좌 정보 수정에 실패했습니다." }, { status: 500 });
  }
}
