import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError, safeQuery } from "@/lib/safeDb";
import { completeConsultingSession } from "@/lib/consultingSession";

export const dynamic = "force-dynamic";

// POST /api/reservations/[id]/complete — 상담 완료 처리 (전화·방문 상담 등)
// 상담사(본인 점집)·관리자 전용. 확정(CONFIRMED) 상태의 예약만 완료할 수 있다.
// body: { memo?: string } — 상담사가 남기는 상담 메모 (선택)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await Promise.resolve(params);

  let reservation;
  try {
    reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { seller: { select: { userId: true } } },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return NextResponse.json(
        { error: "예약 기능이 아직 준비 중입니다." },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  const role = session.user.role;
  const isOwner = role === "CONSULTANT" && reservation.seller.userId === session.user.id;
  if (!isOwner && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "완료 처리 권한이 없습니다." }, { status: 403 });
  }

  if (reservation.status === "COMPLETED") {
    return NextResponse.json({ reservation: { id, status: "COMPLETED" } });
  }
  if (reservation.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "확정된 예약만 완료 처리할 수 있습니다." },
      { status: 400 },
    );
  }

  let memo: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.memo === "string") memo = body.memo;
  } catch {
    // body 없는 호출 허용
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      ...(memo !== null ? { consultantMemo: memo } : {}),
    },
  });

  // 열려 있는 영상 세션이 있으면 함께 종료
  const cs = await safeQuery(
    `complete reservation session (${id})`,
    () =>
      prisma.consultingSession.findUnique({
        where: { reservationId: id },
        select: { id: true, status: true },
      }),
    null,
  );
  if (cs && (cs.status === "WAITING" || cs.status === "ACTIVE")) {
    try {
      await completeConsultingSession(cs.id, {});
    } catch (e) {
      console.error(`[reservations/complete] 세션 정리 실패 (${id}):`, e);
    }
  }

  return NextResponse.json({
    reservation: { id: updated.id, status: updated.status, completedAt: updated.completedAt },
  });
}
