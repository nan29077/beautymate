import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/reservations/[id]/memo — 뷰티 전문가 고객 메모 저장
//
// consultantMemo 컬럼은 스키마에만 추가되고 운영 DB 반영(db push)은 별도로 진행되므로,
// 컬럼이 아직 없는 환경에서는 500 대신 안내 메시지를 반환한다.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "CONSULTANT" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await Promise.resolve(params);
  const body = await request.json().catch(() => ({}));
  const raw = body?.memo;

  if (raw !== null && raw !== undefined && typeof raw !== "string") {
    return NextResponse.json({ error: "메모 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const memo = typeof raw === "string" ? raw.trim() : "";
  if (memo.length > 5000) {
    return NextResponse.json({ error: "메모는 5000자를 넘을 수 없습니다." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true, status: true, seller: { select: { userId: true } } },
  });

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  // 뷰티 전문가는 본인이 진행하는 예약만 메모 작성 가능
  if (role === "CONSULTANT" && reservation.seller.userId !== session.user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 메모는 상담이 끝난 건에 대한 기록이다.
  if (role === "CONSULTANT" && reservation.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "서비스 완료된 예약에만 메모를 남길 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    await prisma.reservation.update({
      where: { id },
      data: { consultantMemo: memo || null },
    });
  } catch (err) {
    console.error("고객 메모 저장 실패:", err);
    return NextResponse.json(
      { error: "메모 저장에 실패했습니다. (DB 스키마 반영 여부를 확인해 주세요)" },
      { status: 500 }
    );
  }

  return NextResponse.json({ memo: memo || null });
}
